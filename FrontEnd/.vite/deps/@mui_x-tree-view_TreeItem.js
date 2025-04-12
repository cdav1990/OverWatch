import {
  Checkbox_default,
  Collapse_default
} from "./chunk-COBO5KRB.js";
import {
  TreeViewItemDepthContext,
  createUseThemeProps,
  generateTreeItemIdAttribute,
  hasPlugin,
  isTargetInDescendants,
  useTreeViewContext,
  useTreeViewLabel,
  warnOnce
} from "./chunk-BQ7TOBVP.js";
import {
  _objectWithoutPropertiesLoose
} from "./chunk-AVUONKA5.js";
import "./chunk-2AREQCCQ.js";
import {
  createSvgIcon
} from "./chunk-I73BTZ6Z.js";
import {
  styled_default
} from "./chunk-PZDEKNX3.js";
import {
  alpha,
  clsx_default,
  composeClasses,
  elementTypeAcceptingRef_default,
  extractEventHandlers_default,
  generateUtilityClass,
  generateUtilityClasses,
  require_prop_types,
  resolveComponentProps_default,
  shouldForwardProp,
  unsupportedProp,
  useForkRef,
  useSlotProps_default
} from "./chunk-TAMEVM6F.js";
import {
  _extends
} from "./chunk-HQ6ZTAWL.js";
import {
  require_jsx_runtime
} from "./chunk-X3C7BU4S.js";
import "./chunk-UYDYBDJS.js";
import {
  require_react
} from "./chunk-Z2EBE445.js";
import {
  __toESM
} from "./chunk-PR4QN5HX.js";

// node_modules/@mui/x-tree-view/TreeItem/TreeItem.js
var React4 = __toESM(require_react());
var import_prop_types4 = __toESM(require_prop_types());

// node_modules/@mui/x-tree-view/TreeItem/TreeItemContent.js
var React2 = __toESM(require_react());
var import_prop_types2 = __toESM(require_prop_types());

// node_modules/@mui/x-tree-view/TreeItem/useTreeItemState.js
function useTreeItemState(itemId) {
  const {
    instance,
    items: {
      onItemClick
    },
    selection: {
      multiSelect,
      checkboxSelection,
      disableSelection
    },
    expansion: {
      expansionTrigger
    }
  } = useTreeViewContext();
  const expandable = instance.isItemExpandable(itemId);
  const expanded = instance.isItemExpanded(itemId);
  const focused = instance.isItemFocused(itemId);
  const selected = instance.isItemSelected(itemId);
  const disabled = instance.isItemDisabled(itemId);
  const editing = instance?.isItemBeingEdited ? instance?.isItemBeingEdited(itemId) : false;
  const editable = instance.isItemEditable ? instance.isItemEditable(itemId) : false;
  const handleExpansion = (event) => {
    if (!disabled) {
      if (!focused) {
        instance.focusItem(event, itemId);
      }
      const multiple = multiSelect && (event.shiftKey || event.ctrlKey || event.metaKey);
      if (expandable && !(multiple && instance.isItemExpanded(itemId))) {
        instance.toggleItemExpansion(event, itemId);
      }
    }
  };
  const handleSelection = (event) => {
    if (!disabled) {
      if (!focused) {
        instance.focusItem(event, itemId);
      }
      const multiple = multiSelect && (event.shiftKey || event.ctrlKey || event.metaKey);
      if (multiple) {
        if (event.shiftKey) {
          instance.expandSelectionRange(event, itemId);
        } else {
          instance.selectItem({
            event,
            itemId,
            keepExistingSelection: true
          });
        }
      } else {
        instance.selectItem({
          event,
          itemId,
          shouldBeSelected: true
        });
      }
    }
  };
  const handleCheckboxSelection = (event) => {
    if (disableSelection || disabled) {
      return;
    }
    const hasShift = event.nativeEvent.shiftKey;
    if (multiSelect && hasShift) {
      instance.expandSelectionRange(event, itemId);
    } else {
      instance.selectItem({
        event,
        itemId,
        keepExistingSelection: multiSelect,
        shouldBeSelected: event.target.checked
      });
    }
  };
  const preventSelection = (event) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey || disabled) {
      event.preventDefault();
    }
  };
  const toggleItemEditing = () => {
    if (!hasPlugin(instance, useTreeViewLabel)) {
      return;
    }
    if (instance.isItemEditable(itemId)) {
      if (instance.isItemBeingEdited(itemId)) {
        instance.setEditedItemId(null);
      } else {
        instance.setEditedItemId(itemId);
      }
    }
  };
  const handleSaveItemLabel = (event, label) => {
    if (!hasPlugin(instance, useTreeViewLabel)) {
      return;
    }
    if (instance.isItemBeingEditedRef(itemId)) {
      instance.updateItemLabel(itemId, label);
      toggleItemEditing();
      instance.focusItem(event, itemId);
    }
  };
  const handleCancelItemLabelEditing = (event) => {
    if (!hasPlugin(instance, useTreeViewLabel)) {
      return;
    }
    if (instance.isItemBeingEditedRef(itemId)) {
      toggleItemEditing();
      instance.focusItem(event, itemId);
    }
  };
  return {
    disabled,
    expanded,
    selected,
    focused,
    editable,
    editing,
    disableSelection,
    checkboxSelection,
    handleExpansion,
    handleSelection,
    handleCheckboxSelection,
    handleContentClick: onItemClick,
    preventSelection,
    expansionTrigger,
    toggleItemEditing,
    handleSaveItemLabel,
    handleCancelItemLabelEditing
  };
}

// node_modules/@mui/x-tree-view/TreeItem2DragAndDropOverlay/TreeItem2DragAndDropOverlay.js
var React = __toESM(require_react());
var import_prop_types = __toESM(require_prop_types());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var TreeItem2DragAndDropOverlayRoot = styled_default("div", {
  name: "MuiTreeItem2DragAndDropOverlay",
  slot: "Root",
  overridesResolver: (props, styles) => styles.root,
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "action"
})(({
  theme
}) => ({
  position: "absolute",
  left: 0,
  display: "flex",
  top: 0,
  bottom: 0,
  right: 0,
  pointerEvents: "none",
  variants: [{
    props: {
      action: "make-child"
    },
    style: {
      marginLeft: "calc(var(--TreeView-indentMultiplier) * var(--TreeView-itemDepth))",
      borderRadius: theme.shape.borderRadius,
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.darkChannel} / ${theme.vars.palette.action.focusOpacity})` : alpha(theme.palette.primary.dark, theme.palette.action.focusOpacity)
    }
  }, {
    props: {
      action: "reorder-above"
    },
    style: {
      marginLeft: "calc(var(--TreeView-indentMultiplier) * var(--TreeView-itemDepth))",
      borderTop: `1px solid ${(theme.vars || theme).palette.action.active}`
    }
  }, {
    props: {
      action: "reorder-below"
    },
    style: {
      marginLeft: "calc(var(--TreeView-indentMultiplier) * var(--TreeView-itemDepth))",
      borderBottom: `1px solid ${(theme.vars || theme).palette.action.active}`
    }
  }, {
    props: {
      action: "move-to-parent"
    },
    style: {
      marginLeft: "calc(var(--TreeView-indentMultiplier) * calc(var(--TreeView-itemDepth) - 1))",
      borderBottom: `1px solid ${(theme.vars || theme).palette.action.active}`
    }
  }]
}));
function TreeItem2DragAndDropOverlay(props) {
  if (props.action == null) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)(TreeItem2DragAndDropOverlayRoot, _extends({}, props));
}
true ? TreeItem2DragAndDropOverlay.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  action: import_prop_types.default.oneOf(["make-child", "move-to-parent", "reorder-above", "reorder-below"]),
  style: import_prop_types.default.object
} : void 0;

// node_modules/@mui/x-tree-view/TreeItem2LabelInput/TreeItem2LabelInput.js
var TreeItem2LabelInput = styled_default("input", {
  name: "MuiTreeItem2",
  slot: "LabelInput",
  overridesResolver: (props, styles) => styles.labelInput
})(({
  theme
}) => _extends({}, theme.typography.body1, {
  width: "100%",
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: "none",
  padding: "0 2px",
  boxSizing: "border-box",
  "&:focus": {
    outline: `1px solid ${theme.palette.primary.main}`
  }
}));

// node_modules/@mui/x-tree-view/TreeItem/TreeItemContent.js
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var _excluded = ["classes", "className", "displayIcon", "expansionIcon", "icon", "label", "itemId", "onClick", "onMouseDown", "dragAndDropOverlayProps", "labelInputProps"];
var TreeItemContent = React2.forwardRef(function TreeItemContent2(props, ref) {
  const {
    classes,
    className,
    displayIcon,
    expansionIcon,
    icon: iconProp,
    label,
    itemId,
    onClick,
    onMouseDown,
    dragAndDropOverlayProps,
    labelInputProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded);
  const {
    disabled,
    expanded,
    selected,
    focused,
    editing,
    editable,
    disableSelection,
    checkboxSelection,
    handleExpansion,
    handleSelection,
    handleCheckboxSelection,
    handleContentClick,
    preventSelection,
    expansionTrigger,
    toggleItemEditing
  } = useTreeItemState(itemId);
  const icon = iconProp || expansionIcon || displayIcon;
  const checkboxRef = React2.useRef(null);
  const handleMouseDown = (event) => {
    preventSelection(event);
    if (onMouseDown) {
      onMouseDown(event);
    }
  };
  const handleClick = (event) => {
    handleContentClick?.(event, itemId);
    if (checkboxRef.current?.contains(event.target)) {
      return;
    }
    if (expansionTrigger === "content") {
      handleExpansion(event);
    }
    if (!checkboxSelection) {
      handleSelection(event);
    }
    if (onClick) {
      onClick(event);
    }
  };
  const handleLabelDoubleClick = (event) => {
    if (event.defaultMuiPrevented) {
      return;
    }
    toggleItemEditing();
  };
  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions -- Key event is handled by the TreeView */
    (0, import_jsx_runtime2.jsxs)("div", _extends({}, other, {
      className: clsx_default(classes.root, className, expanded && classes.expanded, selected && classes.selected, focused && classes.focused, disabled && classes.disabled, editing && classes.editing, editable && classes.editable),
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      ref,
      children: [(0, import_jsx_runtime2.jsx)("div", {
        className: classes.iconContainer,
        children: icon
      }), checkboxSelection && (0, import_jsx_runtime2.jsx)(Checkbox_default, {
        className: classes.checkbox,
        checked: selected,
        onChange: handleCheckboxSelection,
        disabled: disabled || disableSelection,
        ref: checkboxRef,
        tabIndex: -1
      }), editing ? (0, import_jsx_runtime2.jsx)(TreeItem2LabelInput, _extends({}, labelInputProps, {
        className: classes.labelInput
      })) : (0, import_jsx_runtime2.jsx)("div", _extends({
        className: classes.label
      }, editable && {
        onDoubleClick: handleLabelDoubleClick
      }, {
        children: label
      })), dragAndDropOverlayProps && (0, import_jsx_runtime2.jsx)(TreeItem2DragAndDropOverlay, _extends({}, dragAndDropOverlayProps))]
    }))
  );
});
true ? TreeItemContent.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  /**
   * Override or extend the styles applied to the component.
   */
  classes: import_prop_types2.default.object.isRequired,
  className: import_prop_types2.default.string,
  /**
   * The icon to display next to the Tree Item's label. Either a parent or end icon.
   */
  displayIcon: import_prop_types2.default.node,
  dragAndDropOverlayProps: import_prop_types2.default.shape({
    action: import_prop_types2.default.oneOf(["make-child", "move-to-parent", "reorder-above", "reorder-below"]),
    style: import_prop_types2.default.object
  }),
  /**
   * The icon to display next to the Tree Item's label. Either an expansion or collapse icon.
   */
  expansionIcon: import_prop_types2.default.node,
  /**
   * The icon to display next to the Tree Item's label.
   */
  icon: import_prop_types2.default.node,
  /**
   * The id of the item.
   */
  itemId: import_prop_types2.default.string.isRequired,
  /**
   * The Tree Item label.
   */
  label: import_prop_types2.default.node,
  labelInputProps: import_prop_types2.default.shape({
    autoFocus: import_prop_types2.default.oneOf([true]),
    "data-element": import_prop_types2.default.oneOf(["labelInput"]),
    onBlur: import_prop_types2.default.func,
    onChange: import_prop_types2.default.func,
    onKeyDown: import_prop_types2.default.func,
    type: import_prop_types2.default.oneOf(["text"]),
    value: import_prop_types2.default.string
  })
} : void 0;

// node_modules/@mui/x-tree-view/TreeItem/treeItemClasses.js
function getTreeItemUtilityClass(slot) {
  return generateUtilityClass("MuiTreeItem", slot);
}
var treeItemClasses = generateUtilityClasses("MuiTreeItem", ["root", "groupTransition", "content", "expanded", "selected", "focused", "disabled", "iconContainer", "label", "checkbox", "labelInput", "editable", "editing", "dragAndDropOverlay"]);

// node_modules/@mui/x-tree-view/icons/icons.js
var React3 = __toESM(require_react());
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var TreeViewExpandIcon = createSvgIcon((0, import_jsx_runtime3.jsx)("path", {
  d: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
}), "TreeViewExpandIcon");
var TreeViewCollapseIcon = createSvgIcon((0, import_jsx_runtime3.jsx)("path", {
  d: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"
}), "TreeViewCollapseIcon");

// node_modules/@mui/x-tree-view/TreeItem2Provider/TreeItem2Provider.js
var import_prop_types3 = __toESM(require_prop_types());
function TreeItem2Provider(props) {
  const {
    children,
    itemId
  } = props;
  const {
    wrapItem,
    instance
  } = useTreeViewContext();
  return wrapItem({
    children,
    itemId,
    instance
  });
}
TreeItem2Provider.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  children: import_prop_types3.default.node,
  itemId: import_prop_types3.default.string.isRequired
};

// node_modules/@mui/x-tree-view/TreeItem/TreeItem.js
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var _excluded2 = ["children", "className", "slots", "slotProps", "ContentComponent", "ContentProps", "itemId", "id", "label", "onClick", "onMouseDown", "onFocus", "onBlur", "onKeyDown"];
var _excluded22 = ["ownerState"];
var _excluded3 = ["ownerState"];
var _excluded4 = ["ownerState"];
var useThemeProps = createUseThemeProps("MuiTreeItem");
var useUtilityClasses = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    content: ["content"],
    expanded: ["expanded"],
    selected: ["selected"],
    focused: ["focused"],
    disabled: ["disabled"],
    iconContainer: ["iconContainer"],
    checkbox: ["checkbox"],
    label: ["label"],
    labelInput: ["labelInput"],
    editing: ["editing"],
    editable: ["editable"],
    groupTransition: ["groupTransition"]
  };
  return composeClasses(slots, getTreeItemUtilityClass, classes);
};
var TreeItemRoot = styled_default("li", {
  name: "MuiTreeItem",
  slot: "Root",
  overridesResolver: (props, styles) => styles.root
})({
  listStyle: "none",
  margin: 0,
  padding: 0,
  outline: 0
});
var StyledTreeItemContent = styled_default(TreeItemContent, {
  name: "MuiTreeItem",
  slot: "Content",
  overridesResolver: (props, styles) => {
    return [styles.content, styles.iconContainer && {
      [`& .${treeItemClasses.iconContainer}`]: styles.iconContainer
    }, styles.label && {
      [`& .${treeItemClasses.label}`]: styles.label
    }];
  },
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "indentationAtItemLevel"
})(({
  theme
}) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  width: "100%",
  boxSizing: "border-box",
  // prevent width + padding to overflow
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  "&:hover": {
    backgroundColor: (theme.vars || theme).palette.action.hover,
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  },
  [`&.${treeItemClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity,
    backgroundColor: "transparent"
  },
  [`&.${treeItemClasses.focused}`]: {
    backgroundColor: (theme.vars || theme).palette.action.focus
  },
  [`&.${treeItemClasses.selected}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    "&:hover": {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
      }
    },
    [`&.${treeItemClasses.focused}`]: {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
    }
  },
  [`& .${treeItemClasses.iconContainer}`]: {
    width: 16,
    display: "flex",
    flexShrink: 0,
    justifyContent: "center",
    "& svg": {
      fontSize: 18
    }
  },
  [`& .${treeItemClasses.label}`]: _extends({
    width: "100%",
    boxSizing: "border-box",
    // prevent width + padding to overflow
    // fixes overflow - see https://github.com/mui/material-ui/issues/27372
    minWidth: 0,
    position: "relative"
  }, theme.typography.body1),
  [`& .${treeItemClasses.checkbox}`]: {
    padding: 0
  },
  variants: [{
    props: {
      indentationAtItemLevel: true
    },
    style: {
      paddingLeft: `calc(${theme.spacing(1)} + var(--TreeView-itemChildrenIndentation) * var(--TreeView-itemDepth))`
    }
  }]
}));
var TreeItemGroup = styled_default(Collapse_default, {
  name: "MuiTreeItem",
  slot: "GroupTransition",
  overridesResolver: (props, styles) => styles.groupTransition,
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "indentationAtItemLevel"
})({
  margin: 0,
  padding: 0,
  paddingLeft: "var(--TreeView-itemChildrenIndentation)",
  variants: [{
    props: {
      indentationAtItemLevel: true
    },
    style: {
      paddingLeft: 0
    }
  }]
});
var TreeItem = React4.forwardRef(function TreeItem2(inProps, inRef) {
  const {
    icons: contextIcons,
    runItemPlugins,
    items: {
      disabledItemsFocusable,
      indentationAtItemLevel
    },
    selection: {
      disableSelection
    },
    expansion: {
      expansionTrigger
    },
    treeId,
    instance
  } = useTreeViewContext();
  const depthContext = React4.useContext(TreeViewItemDepthContext);
  const props = useThemeProps({
    props: inProps,
    name: "MuiTreeItem"
  });
  const {
    children,
    className,
    slots: inSlots,
    slotProps: inSlotProps,
    ContentComponent = TreeItemContent,
    ContentProps,
    itemId,
    id,
    label,
    onClick,
    onMouseDown,
    onBlur,
    onKeyDown
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded2);
  const {
    expanded,
    focused,
    selected,
    disabled,
    editing,
    handleExpansion,
    handleCancelItemLabelEditing,
    handleSaveItemLabel
  } = useTreeItemState(itemId);
  if (true) {
    if (props.ContentComponent) {
      warnOnce(["MUI X: The ContentComponent prop of the TreeItem component is deprecated and will be removed in the next major release.", "You can use the new TreeItem2 component or the new useTreeItem2 hook to customize the rendering of the content.", "For more detail, see https://mui.com/x/react-tree-view/tree-item-customization/."]);
    }
    if (props.ContentProps) {
      warnOnce(["MUI X: The ContentProps prop of the TreeItem component is deprecated and will be removed in the next major release.", "You can use the new TreeItem2 component or the new useTreeItem2 hook to customize the rendering of the content.", "For more detail, see https://mui.com/x/react-tree-view/tree-item-customization/."]);
    }
  }
  const {
    contentRef,
    rootRef,
    propsEnhancers
  } = runItemPlugins(props);
  const rootRefObject = React4.useRef(null);
  const contentRefObject = React4.useRef(null);
  const handleRootRef = useForkRef(inRef, rootRef, rootRefObject);
  const handleContentRef = useForkRef(ContentProps?.ref, contentRef, contentRefObject);
  const slots = {
    expandIcon: inSlots?.expandIcon ?? contextIcons.slots.expandIcon ?? TreeViewExpandIcon,
    collapseIcon: inSlots?.collapseIcon ?? contextIcons.slots.collapseIcon ?? TreeViewCollapseIcon,
    endIcon: inSlots?.endIcon ?? contextIcons.slots.endIcon,
    icon: inSlots?.icon,
    groupTransition: inSlots?.groupTransition
  };
  const isExpandable = (reactChildren) => {
    if (Array.isArray(reactChildren)) {
      return reactChildren.length > 0 && reactChildren.some(isExpandable);
    }
    return Boolean(reactChildren);
  };
  const expandable = isExpandable(children);
  const ownerState = _extends({}, props, {
    expanded,
    focused,
    selected,
    disabled,
    indentationAtItemLevel
  });
  const classes = useUtilityClasses(ownerState);
  const GroupTransition = slots.groupTransition ?? void 0;
  const groupTransitionProps = useSlotProps_default({
    elementType: GroupTransition,
    ownerState: {},
    externalSlotProps: inSlotProps?.groupTransition,
    additionalProps: _extends({
      unmountOnExit: true,
      in: expanded,
      component: "ul",
      role: "group"
    }, indentationAtItemLevel ? {
      indentationAtItemLevel: true
    } : {}),
    className: classes.groupTransition
  });
  const handleIconContainerClick = (event) => {
    if (expansionTrigger === "iconContainer") {
      handleExpansion(event);
    }
  };
  const ExpansionIcon = expanded ? slots.collapseIcon : slots.expandIcon;
  const _useSlotProps = useSlotProps_default({
    elementType: ExpansionIcon,
    ownerState: {},
    externalSlotProps: (tempOwnerState) => {
      if (expanded) {
        return _extends({}, resolveComponentProps_default(contextIcons.slotProps.collapseIcon, tempOwnerState), resolveComponentProps_default(inSlotProps?.collapseIcon, tempOwnerState));
      }
      return _extends({}, resolveComponentProps_default(contextIcons.slotProps.expandIcon, tempOwnerState), resolveComponentProps_default(inSlotProps?.expandIcon, tempOwnerState));
    },
    additionalProps: {
      onClick: handleIconContainerClick
    }
  }), expansionIconProps = _objectWithoutPropertiesLoose(_useSlotProps, _excluded22);
  const expansionIcon = expandable && !!ExpansionIcon ? (0, import_jsx_runtime4.jsx)(ExpansionIcon, _extends({}, expansionIconProps)) : null;
  const DisplayIcon = expandable ? void 0 : slots.endIcon;
  const _useSlotProps2 = useSlotProps_default({
    elementType: DisplayIcon,
    ownerState: {},
    externalSlotProps: (tempOwnerState) => {
      if (expandable) {
        return {};
      }
      return _extends({}, resolveComponentProps_default(contextIcons.slotProps.endIcon, tempOwnerState), resolveComponentProps_default(inSlotProps?.endIcon, tempOwnerState));
    }
  }), displayIconProps = _objectWithoutPropertiesLoose(_useSlotProps2, _excluded3);
  const displayIcon = DisplayIcon ? (0, import_jsx_runtime4.jsx)(DisplayIcon, _extends({}, displayIconProps)) : null;
  const Icon = slots.icon;
  const _useSlotProps3 = useSlotProps_default({
    elementType: Icon,
    ownerState: {},
    externalSlotProps: inSlotProps?.icon
  }), iconProps = _objectWithoutPropertiesLoose(_useSlotProps3, _excluded4);
  const icon = Icon ? (0, import_jsx_runtime4.jsx)(Icon, _extends({}, iconProps)) : null;
  let ariaSelected;
  if (selected) {
    ariaSelected = true;
  } else if (disableSelection || disabled) {
    ariaSelected = void 0;
  } else {
    ariaSelected = false;
  }
  function handleFocus(event) {
    const canBeFocused = !disabled || disabledItemsFocusable;
    if (!focused && canBeFocused && event.currentTarget === event.target) {
      instance.focusItem(event, itemId);
    }
  }
  function handleBlur(event) {
    onBlur?.(event);
    if (editing || // we can exit the editing state by clicking outside the input (within the Tree Item) or by pressing Enter or Escape -> we don't want to remove the focused item from the state in these cases
    // we can also exit the editing state by clicking on the root itself -> want to remove the focused item from the state in this case
    event.relatedTarget && isTargetInDescendants(event.relatedTarget, rootRefObject.current) && (event.target && event.target?.dataset?.element === "labelInput" && isTargetInDescendants(event.target, rootRefObject.current) || event.relatedTarget?.dataset?.element === "labelInput")) {
      return;
    }
    instance.removeFocusedItem();
  }
  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.target?.dataset?.element === "labelInput") {
      return;
    }
    instance.handleItemKeyDown(event, itemId);
  };
  const idAttribute = generateTreeItemIdAttribute({
    itemId,
    treeId,
    id
  });
  const tabIndex = instance.canItemBeTabbed(itemId) ? 0 : -1;
  const sharedPropsEnhancerParams = {
    rootRefObject,
    contentRefObject,
    interactions: {
      handleSaveItemLabel,
      handleCancelItemLabelEditing
    }
  };
  const enhancedRootProps = propsEnhancers.root?.(_extends({}, sharedPropsEnhancerParams, {
    externalEventHandlers: extractEventHandlers_default(other)
  })) ?? {};
  const enhancedContentProps = propsEnhancers.content?.(_extends({}, sharedPropsEnhancerParams, {
    externalEventHandlers: extractEventHandlers_default(ContentProps)
  })) ?? {};
  const enhancedDragAndDropOverlayProps = propsEnhancers.dragAndDropOverlay?.(_extends({}, sharedPropsEnhancerParams, {
    externalEventHandlers: {}
  })) ?? {};
  const enhancedLabelInputProps = propsEnhancers.labelInput?.(_extends({}, sharedPropsEnhancerParams, {
    externalEventHandlers: {}
  })) ?? {};
  return (0, import_jsx_runtime4.jsx)(TreeItem2Provider, {
    itemId,
    children: (0, import_jsx_runtime4.jsxs)(TreeItemRoot, _extends({
      className: clsx_default(classes.root, className),
      role: "treeitem",
      "aria-expanded": expandable ? expanded : void 0,
      "aria-selected": ariaSelected,
      "aria-disabled": disabled || void 0,
      id: idAttribute,
      tabIndex
    }, other, {
      ownerState,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      ref: handleRootRef,
      style: indentationAtItemLevel ? _extends({}, other.style, {
        "--TreeView-itemDepth": typeof depthContext === "function" ? depthContext(itemId) : depthContext
      }) : other.style
    }, enhancedRootProps, {
      children: [(0, import_jsx_runtime4.jsx)(StyledTreeItemContent, _extends({
        as: ContentComponent,
        classes: {
          root: classes.content,
          expanded: classes.expanded,
          selected: classes.selected,
          focused: classes.focused,
          disabled: classes.disabled,
          editable: classes.editable,
          editing: classes.editing,
          iconContainer: classes.iconContainer,
          label: classes.label,
          labelInput: classes.labelInput,
          checkbox: classes.checkbox
        },
        label,
        itemId,
        onClick,
        onMouseDown,
        icon,
        expansionIcon,
        displayIcon,
        ownerState
      }, ContentProps, enhancedContentProps, enhancedDragAndDropOverlayProps.action == null ? {} : {
        dragAndDropOverlayProps: enhancedDragAndDropOverlayProps
      }, enhancedLabelInputProps.value == null ? {} : {
        labelInputProps: enhancedLabelInputProps
      }, {
        ref: handleContentRef
      })), children && (0, import_jsx_runtime4.jsx)(TreeItemGroup, _extends({
        as: GroupTransition
      }, groupTransitionProps, {
        children
      }))]
    }))
  });
});
true ? TreeItem.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  /**
   * The content of the component.
   */
  children: import_prop_types4.default.node,
  /**
   * Override or extend the styles applied to the component.
   */
  classes: import_prop_types4.default.object,
  className: import_prop_types4.default.string,
  /**
   * The component used to render the content of the item.
   * @deprecated Consider using the `<TreeItem2 />` component or the `useTreeItem2` hook instead. For more details, see https://mui.com/x/react-tree-view/tree-item-customization/.
   * @default TreeItemContent
   */
  ContentComponent: elementTypeAcceptingRef_default,
  /**
   * Props applied to ContentComponent.
   * @deprecated Consider using the `<TreeItem2 />` component or the `useTreeItem2` hook instead. For more details, see https://mui.com/x/react-tree-view/tree-item-customization/.
   */
  ContentProps: import_prop_types4.default.object,
  /**
   * If `true`, the item is disabled.
   * @default false
   */
  disabled: import_prop_types4.default.bool,
  /**
   * The id of the item.
   */
  itemId: import_prop_types4.default.string.isRequired,
  /**
   * The Tree Item label.
   */
  label: import_prop_types4.default.node,
  /**
   * This prop isn't supported.
   * Use the `onItemFocus` callback on the tree if you need to monitor a item's focus.
   */
  onFocus: unsupportedProp,
  /**
   * Callback fired when a key of the keyboard is pressed on the item.
   */
  onKeyDown: import_prop_types4.default.func,
  /**
   * The props used for each component slot.
   * @default {}
   */
  slotProps: import_prop_types4.default.object,
  /**
   * Overridable component slots.
   * @default {}
   */
  slots: import_prop_types4.default.object,
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx: import_prop_types4.default.oneOfType([import_prop_types4.default.arrayOf(import_prop_types4.default.oneOfType([import_prop_types4.default.func, import_prop_types4.default.object, import_prop_types4.default.bool])), import_prop_types4.default.func, import_prop_types4.default.object])
} : void 0;
export {
  TreeItem,
  TreeItemContent,
  getTreeItemUtilityClass,
  treeItemClasses,
  useTreeItemState
};
//# sourceMappingURL=@mui_x-tree-view_TreeItem.js.map
