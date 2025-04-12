const si = require('systeminformation');

/**
 * Service for monitoring system resources
 */
class SystemMonitorService {
  /**
   * Get comprehensive system health information
   * @returns {Promise<Object>} The system health metrics
   */
  async getSystemHealth() {
    try {
      // Collect all metrics in parallel for efficiency
      const [cpuData, memData, diskData, networkData, tempData, processData] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.cpuTemperature(),
        si.processes()
      ]);

      // Calculate CPU usage percentage from load
      const cpuUsage = cpuData.currentLoad;
      
      // Calculate memory usage percentage
      const memoryUsage = (memData.used / memData.total) * 100;
      
      // Calculate aggregate storage usage percentage (average across all drives)
      const storageUsage = diskData.reduce((acc, disk) => {
        return acc + (disk.used / disk.size) * 100;
      }, 0) / Math.max(1, diskData.length);
      
      // Calculate network bandwidth usage (as a percentage of typical home connection)
      // This is an estimate since we don't know the max bandwidth
      // For more accurate values, you may need to configure this based on your network capacity
      const totalNetworkBandwidth = networkData.reduce((acc, net) => {
        return acc + net.tx_sec + net.rx_sec;
      }, 0);
      
      // Assuming 100 Mbps connection (adjust this value as needed)
      const maxBandwidth = 100 * 1024 * 1024 / 8; // 100 Mbps in bytes per second
      const networkUsage = Math.min(100, (totalNetworkBandwidth / maxBandwidth) * 100);
      
      // Get CPU temperature (main temperature if available)
      const temperature = tempData.main || tempData.cores?.[0] || 0;
      
      // Get total number of processes
      const processCount = processData.all;

      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        storage: storageUsage, 
        network: networkUsage,
        temperature: temperature,
        processes: processCount,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw new Error('Failed to collect system metrics');
    }
  }
}

module.exports = new SystemMonitorService(); 