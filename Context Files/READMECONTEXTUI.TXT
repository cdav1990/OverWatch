## UI Context & Dependency Watchlist

### MUI Grid v1 API Usage (Requires Attention)

**Issue:**
Across the application, particularly noticed in `FrontEnd/src/pages/MissionPage/Steps/BuildSceneStep.tsx` (now fixed) and `FrontEnd/src/pages/MissionPage/Steps/PreChecksStep.tsx` (needs fixing), the Material UI `Grid` component was being used with syntax from the older Grid v1 API (common in MUI v4 and earlier). While MUI v5+ (including v7, which is used in this project) offers backward compatibility, using the old API generates console warnings and can lead to confusing TypeScript errors (like properties seemingly not existing).

**Symptoms:**
1.  **Console Warnings:** You will see warnings like:
    *   `MUI Grid: The 'item' prop has been removed and is no longer necessary. You can safely remove it.`
    *   `MUI Grid: The 'xs' prop has been removed. See https://mui.com/material-ui/migration/upgr...` (and similar for `sm`, `md`, etc.)
2.  **TypeScript Errors (Potential):** We encountered persistent and sometimes contradictory TypeScript errors related to the `item` and breakpoint (`xs`, `sm`, etc.) props on `Grid` components, likely stemming from the type conflicts between the legacy usage and the v5+ type definitions.

**Fix (MUI v5+ / Grid v2 API):**
The standard and correct way to use the Grid component in MUI v5+ is:
1.  Identify the parent `<Grid container ...>` component.
2.  For child `<Grid>` components that act as items within the container:
    *   **Remove** the `item` prop completely.
    *   Apply the responsive breakpoint props (`xs`, `sm`, `md`, `lg`, `xl`) **directly** to the child `<Grid>` component.

**Example:**

**Old (v1 API):**
```jsx
<Grid container spacing={2}>
  <Grid item xs={12} sm={6}>
    {/* Content */}
  </Grid>
  <Grid item xs={12} sm={6}>
    {/* Content */}
  </Grid>
</Grid>
```

**New (v2 API - Correct for v5+):**
```jsx
<Grid container spacing={2}>
  <Grid xs={12} sm={6}>  {/* No 'item' prop */}
    {/* Content */}
  </Grid>
  <Grid xs={12} sm={6}>  {/* No 'item' prop */}
    {/* Content */}
  </Grid>
</Grid>
```

**Status:**
*   `FrontEnd/src/pages/MissionPage/Steps/BuildSceneStep.tsx`: **Fixed** (Refactored to use Flexbox, which also resolved the Grid issues).
*   `FrontEnd/src/pages/MissionPage/Steps/PreChecksStep.tsx`: **Needs Fix** (Exhibits the console warnings). Apply the fix described above to the `Grid` components within this file or its children.

**Importance:**
Consistently using the correct Grid v2 API syntax is important for:
*   Eliminating console noise.
*   Ensuring correct type checking and avoiding spurious TypeScript errors.
*   Leveraging potential performance improvements in the newer Grid implementation.
*   Maintaining a modern and stable codebase aligned with current library versions.
