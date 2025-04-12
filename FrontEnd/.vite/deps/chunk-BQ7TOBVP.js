import {
  useThemeProps
} from "./chunk-2AREQCCQ.js";
import {
  _extends
} from "./chunk-HQ6ZTAWL.js";
import {
  require_jsx_runtime
} from "./chunk-X3C7BU4S.js";
import {
  require_react
} from "./chunk-Z2EBE445.js";
import {
  __toESM
} from "./chunk-PR4QN5HX.js";

// node_modules/@mui/x-internals/esm/warning/warning.js
var warnedOnceCache = /* @__PURE__ */ new Set();
function warnOnce(message, gravity = "warning") {
  if (false) {
    return;
  }
  const cleanMessage = Array.isArray(message) ? message.join("\n") : message;
  if (!warnedOnceCache.has(cleanMessage)) {
    warnedOnceCache.add(cleanMessage);
    if (gravity === "error") {
      console.error(cleanMessage);
    } else {
      console.warn(cleanMessage);
    }
  }
}

// node_modules/@mui/x-tree-view/internals/zero-styled/index.js
function createUseThemeProps(name) {
  return useThemeProps;
}

// node_modules/@mui/x-tree-view/internals/TreeViewProvider/useTreeViewContext.js
var React2 = __toESM(require_react());

// node_modules/@mui/x-tree-view/internals/TreeViewProvider/TreeViewContext.js
var React = __toESM(require_react());
var TreeViewContext = React.createContext(null);
if (true) {
  TreeViewContext.displayName = "TreeViewContext";
}

// node_modules/@mui/x-tree-view/internals/TreeViewProvider/useTreeViewContext.js
var useTreeViewContext = () => {
  const context = React2.useContext(TreeViewContext);
  if (context == null) {
    throw new Error(["MUI X: Could not find the Tree View context.", "It looks like you rendered your component outside of a SimpleTreeView or RichTreeView parent component.", "This can also happen if you are bundling multiple versions of the Tree View."].join("\n"));
  }
  return context;
};

// node_modules/@mui/x-tree-view/internals/TreeViewProvider/TreeViewProvider.js
var React3 = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
function TreeViewProvider(props) {
  const {
    value,
    children
  } = props;
  return (0, import_jsx_runtime.jsx)(TreeViewContext.Provider, {
    value,
    children: value.wrapRoot({
      children,
      instance: value.instance
    })
  });
}

// node_modules/@mui/x-tree-view/internals/plugins/useTreeViewLabel/useTreeViewLabel.js
var React5 = __toESM(require_react());

// node_modules/@mui/x-tree-view/internals/plugins/useTreeViewLabel/useTreeViewLabel.itemPlugin.js
var React4 = __toESM(require_react());
var useTreeViewLabelItemPlugin = ({
  props
}) => {
  const {
    instance
  } = useTreeViewContext();
  const {
    label,
    itemId
  } = props;
  const [labelInputValue, setLabelInputValue] = React4.useState(label);
  const isItemBeingEdited = instance.isItemBeingEdited(itemId);
  React4.useEffect(() => {
    if (!isItemBeingEdited) {
      setLabelInputValue(label);
    }
  }, [isItemBeingEdited, label]);
  return {
    propsEnhancers: {
      labelInput: ({
        externalEventHandlers,
        interactions
      }) => {
        const editable = instance.isItemEditable(itemId);
        if (!editable) {
          return {};
        }
        const handleKeydown = (event) => {
          externalEventHandlers.onKeyDown?.(event);
          if (event.defaultMuiPrevented) {
            return;
          }
          const target = event.target;
          if (event.key === "Enter" && target.value) {
            interactions.handleSaveItemLabel(event, target.value);
          } else if (event.key === "Escape") {
            interactions.handleCancelItemLabelEditing(event);
          }
        };
        const handleBlur = (event) => {
          externalEventHandlers.onBlur?.(event);
          if (event.defaultMuiPrevented) {
            return;
          }
          if (event.target.value) {
            interactions.handleSaveItemLabel(event, event.target.value);
          }
        };
        const handleInputChange = (event) => {
          externalEventHandlers.onChange?.(event);
          setLabelInputValue(event.target.value);
        };
        return {
          value: labelInputValue ?? "",
          "data-element": "labelInput",
          onChange: handleInputChange,
          onKeyDown: handleKeydown,
          onBlur: handleBlur,
          autoFocus: true,
          type: "text"
        };
      }
    }
  };
};

// node_modules/@mui/x-tree-view/internals/plugins/useTreeViewLabel/useTreeViewLabel.js
var useTreeViewLabel = ({
  instance,
  state,
  setState,
  params
}) => {
  const editedItemRef = React5.useRef(state.editedItemId);
  const isItemBeingEditedRef = (itemId) => editedItemRef.current === itemId;
  const setEditedItemId = (editedItemId) => {
    setState((prevState) => _extends({}, prevState, {
      editedItemId
    }));
    editedItemRef.current = editedItemId;
  };
  const isItemBeingEdited = (itemId) => itemId === state.editedItemId;
  const isTreeViewEditable = Boolean(params.isItemEditable);
  const isItemEditable = (itemId) => {
    if (itemId == null || !isTreeViewEditable) {
      return false;
    }
    const item = instance.getItem(itemId);
    if (!item) {
      return false;
    }
    return typeof params.isItemEditable === "function" ? params.isItemEditable(item) : Boolean(params.isItemEditable);
  };
  const updateItemLabel = (itemId, label) => {
    if (!label) {
      throw new Error(["MUI X: The Tree View component requires all items to have a `label` property.", "The label of an item cannot be empty.", itemId].join("\n"));
    }
    setState((prevState) => {
      const item = prevState.items.itemMetaMap[itemId];
      if (item.label !== label) {
        return _extends({}, prevState, {
          items: _extends({}, prevState.items, {
            itemMetaMap: _extends({}, prevState.items.itemMetaMap, {
              [itemId]: _extends({}, item, {
                label
              })
            })
          })
        });
      }
      return prevState;
    });
    if (params.onItemLabelChange) {
      params.onItemLabelChange(itemId, label);
    }
  };
  return {
    instance: {
      setEditedItemId,
      isItemBeingEdited,
      updateItemLabel,
      isItemEditable,
      isTreeViewEditable,
      isItemBeingEditedRef
    },
    publicAPI: {
      updateItemLabel
    }
  };
};
useTreeViewLabel.itemPlugin = useTreeViewLabelItemPlugin;
useTreeViewLabel.getDefaultizedParams = ({
  params,
  experimentalFeatures
}) => {
  const canUseFeature = experimentalFeatures?.labelEditing;
  if (true) {
    if (params.isItemEditable && !canUseFeature) {
      warnOnce(["MUI X: The label editing feature requires the `labelEditing` experimental feature to be enabled.", "You can do it by passing `experimentalFeatures={{ labelEditing: true}}` to the Rich Tree View Pro component.", "Check the documentation for more details: https://mui.com/x/react-tree-view/rich-tree-view/editing/"]);
    }
  }
  return _extends({}, params, {
    isItemEditable: canUseFeature ? params.isItemEditable ?? false : false
  });
};
useTreeViewLabel.getInitialState = () => ({
  editedItemId: null
});
useTreeViewLabel.params = {
  onItemLabelChange: true,
  isItemEditable: true
};

// node_modules/@mui/x-tree-view/internals/utils/plugins.js
var hasPlugin = (instance, plugin) => {
  const plugins = instance.getAvailablePlugins();
  return plugins.has(plugin);
};

// node_modules/@mui/x-tree-view/internals/TreeViewItemDepthContext/TreeViewItemDepthContext.js
var React6 = __toESM(require_react());
var TreeViewItemDepthContext = React6.createContext(() => -1);
if (true) {
  TreeViewItemDepthContext.displayName = "TreeViewItemDepthContext";
}

// node_modules/@mui/x-tree-view/internals/utils/tree.js
var getLastNavigableItemInArray = (instance, items) => {
  let itemIndex = items.length - 1;
  while (itemIndex >= 0 && !instance.isItemNavigable(items[itemIndex])) {
    itemIndex -= 1;
  }
  if (itemIndex === -1) {
    return void 0;
  }
  return items[itemIndex];
};
var getPreviousNavigableItem = (instance, itemId) => {
  const itemMeta = instance.getItemMeta(itemId);
  const siblings = instance.getItemOrderedChildrenIds(itemMeta.parentId);
  const itemIndex = instance.getItemIndex(itemId);
  if (itemIndex === 0) {
    return itemMeta.parentId;
  }
  let previousNavigableSiblingIndex = itemIndex - 1;
  while (!instance.isItemNavigable(siblings[previousNavigableSiblingIndex]) && previousNavigableSiblingIndex >= 0) {
    previousNavigableSiblingIndex -= 1;
  }
  if (previousNavigableSiblingIndex === -1) {
    if (itemMeta.parentId == null) {
      return null;
    }
    return getPreviousNavigableItem(instance, itemMeta.parentId);
  }
  let currentItemId = siblings[previousNavigableSiblingIndex];
  let lastNavigableChild = getLastNavigableItemInArray(instance, instance.getItemOrderedChildrenIds(currentItemId));
  while (instance.isItemExpanded(currentItemId) && lastNavigableChild != null) {
    currentItemId = lastNavigableChild;
    lastNavigableChild = instance.getItemOrderedChildrenIds(currentItemId).find(instance.isItemNavigable);
  }
  return currentItemId;
};
var getNextNavigableItem = (instance, itemId) => {
  if (instance.isItemExpanded(itemId)) {
    const firstNavigableChild = instance.getItemOrderedChildrenIds(itemId).find(instance.isItemNavigable);
    if (firstNavigableChild != null) {
      return firstNavigableChild;
    }
  }
  let itemMeta = instance.getItemMeta(itemId);
  while (itemMeta != null) {
    const siblings = instance.getItemOrderedChildrenIds(itemMeta.parentId);
    const currentItemIndex = instance.getItemIndex(itemMeta.id);
    if (currentItemIndex < siblings.length - 1) {
      let nextItemIndex = currentItemIndex + 1;
      while (!instance.isItemNavigable(siblings[nextItemIndex]) && nextItemIndex < siblings.length - 1) {
        nextItemIndex += 1;
      }
      if (instance.isItemNavigable(siblings[nextItemIndex])) {
        return siblings[nextItemIndex];
      }
    }
    itemMeta = instance.getItemMeta(itemMeta.parentId);
  }
  return null;
};
var getLastNavigableItem = (instance) => {
  let itemId = null;
  while (itemId == null || instance.isItemExpanded(itemId)) {
    const children = instance.getItemOrderedChildrenIds(itemId);
    const lastNavigableChild = getLastNavigableItemInArray(instance, children);
    if (lastNavigableChild == null) {
      return itemId;
    }
    itemId = lastNavigableChild;
  }
  return itemId;
};
var getFirstNavigableItem = (instance) => instance.getItemOrderedChildrenIds(null).find(instance.isItemNavigable);
var findOrderInTremauxTree = (instance, itemAId, itemBId) => {
  if (itemAId === itemBId) {
    return [itemAId, itemBId];
  }
  const itemMetaA = instance.getItemMeta(itemAId);
  const itemMetaB = instance.getItemMeta(itemBId);
  if (itemMetaA.parentId === itemMetaB.id || itemMetaB.parentId === itemMetaA.id) {
    return itemMetaB.parentId === itemMetaA.id ? [itemMetaA.id, itemMetaB.id] : [itemMetaB.id, itemMetaA.id];
  }
  const aFamily = [itemMetaA.id];
  const bFamily = [itemMetaB.id];
  let aAncestor = itemMetaA.parentId;
  let bAncestor = itemMetaB.parentId;
  let aAncestorIsCommon = bFamily.indexOf(aAncestor) !== -1;
  let bAncestorIsCommon = aFamily.indexOf(bAncestor) !== -1;
  let continueA = true;
  let continueB = true;
  while (!bAncestorIsCommon && !aAncestorIsCommon) {
    if (continueA) {
      aFamily.push(aAncestor);
      aAncestorIsCommon = bFamily.indexOf(aAncestor) !== -1;
      continueA = aAncestor !== null;
      if (!aAncestorIsCommon && continueA) {
        aAncestor = instance.getItemMeta(aAncestor).parentId;
      }
    }
    if (continueB && !aAncestorIsCommon) {
      bFamily.push(bAncestor);
      bAncestorIsCommon = aFamily.indexOf(bAncestor) !== -1;
      continueB = bAncestor !== null;
      if (!bAncestorIsCommon && continueB) {
        bAncestor = instance.getItemMeta(bAncestor).parentId;
      }
    }
  }
  const commonAncestor = aAncestorIsCommon ? aAncestor : bAncestor;
  const ancestorFamily = instance.getItemOrderedChildrenIds(commonAncestor);
  const aSide = aFamily[aFamily.indexOf(commonAncestor) - 1];
  const bSide = bFamily[bFamily.indexOf(commonAncestor) - 1];
  return ancestorFamily.indexOf(aSide) < ancestorFamily.indexOf(bSide) ? [itemAId, itemBId] : [itemBId, itemAId];
};
var getNonDisabledItemsInRange = (instance, itemAId, itemBId) => {
  const getNextItem = (itemId) => {
    if (instance.isItemExpandable(itemId) && instance.isItemExpanded(itemId)) {
      return instance.getItemOrderedChildrenIds(itemId)[0];
    }
    let itemMeta = instance.getItemMeta(itemId);
    while (itemMeta != null) {
      const siblings = instance.getItemOrderedChildrenIds(itemMeta.parentId);
      const currentItemIndex = instance.getItemIndex(itemMeta.id);
      if (currentItemIndex < siblings.length - 1) {
        return siblings[currentItemIndex + 1];
      }
      itemMeta = instance.getItemMeta(itemMeta.parentId);
    }
    throw new Error("Invalid range");
  };
  const [first, last] = findOrderInTremauxTree(instance, itemAId, itemBId);
  const items = [first];
  let current = first;
  while (current !== last) {
    current = getNextItem(current);
    if (!instance.isItemDisabled(current)) {
      items.push(current);
    }
  }
  return items;
};
var getAllNavigableItems = (instance) => {
  let item = getFirstNavigableItem(instance);
  const navigableItems = [];
  while (item != null) {
    navigableItems.push(item);
    item = getNextNavigableItem(instance, item);
  }
  return navigableItems;
};
var isTargetInDescendants = (target, itemRoot) => {
  return itemRoot !== target.closest('*[role="treeitem"]');
};

// node_modules/@mui/x-tree-view/internals/corePlugins/useTreeViewId/useTreeViewId.utils.js
var globalTreeViewDefaultId = 0;
var createTreeViewDefaultId = () => {
  globalTreeViewDefaultId += 1;
  return `mui-tree-view-${globalTreeViewDefaultId}`;
};
var generateTreeItemIdAttribute = ({
  id,
  treeId = "",
  itemId
}) => {
  if (id != null) {
    return id;
  }
  return `${treeId}-${itemId}`;
};

export {
  warnOnce,
  createUseThemeProps,
  TreeViewProvider,
  useTreeViewContext,
  useTreeViewLabel,
  hasPlugin,
  TreeViewItemDepthContext,
  getPreviousNavigableItem,
  getNextNavigableItem,
  getLastNavigableItem,
  getFirstNavigableItem,
  findOrderInTremauxTree,
  getNonDisabledItemsInRange,
  getAllNavigableItems,
  isTargetInDescendants,
  createTreeViewDefaultId,
  generateTreeItemIdAttribute
};
//# sourceMappingURL=chunk-BQ7TOBVP.js.map
