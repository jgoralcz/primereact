import * as React from 'react';
import { FilterMatchMode, FilterOperator, localeOption } from '../api/Api';
import { PrimeReactContext } from '../api/context';
import { Button } from '../button/Button';
import { ColumnBase } from '../column/ColumnBase';
import { CSSTransition } from '../csstransition/CSSTransition';
import { Dropdown } from '../dropdown/Dropdown';
import { useOverlayListener, useUnmountEffect, useUpdateEffect } from '../hooks/Hooks';
import { FilterIcon } from '../icons/filter';
import { FilterSlashIcon } from '../icons/filterslash';
import { PlusIcon } from '../icons/plus';
import { TrashIcon } from '../icons/trash';
import { InputText } from '../inputtext/InputText';
import { OverlayService } from '../overlayservice/OverlayService';
import { Portal } from '../portal/Portal';
import { Ripple } from '../ripple/Ripple';
import { DomHandler, IconUtils, ObjectUtils, ZIndexUtils, classNames, mergeProps } from '../utils/Utils';

export const ColumnFilter = React.memo((props) => {
    const [overlayVisibleState, setOverlayVisibleState] = React.useState(false);
    const overlayRef = React.useRef(null);
    const iconRef = React.useRef(null);
    const selfClick = React.useRef(false);
    const overlayEventListener = React.useRef(null);
    const getColumnProp = (name) => ColumnBase.getCProp(props.column, name);
    const getColumnProps = () => ColumnBase.getCProps(props.column);
    const { filterMatchModeOptions, zIndex, appendTo, autoZIndex, inputStyle, ripple } = React.useContext(PrimeReactContext);

    const getColumnPTOptions = (key) => {
        return props.ptCallbacks.ptmo(getColumnProps(), key, {
            props: getColumnProps(),
            parent: props.metaData,
            state: {
                overlayVisible: overlayVisibleState
            }
        });
    };

    const field = getColumnProp('filterField') || getColumnProp('field');
    const filterModel = props.filters[field];
    const filterStoreModel = props.filtersStore && props.filtersStore[field];

    const [bindOverlayListener, unbindOverlayListener] = useOverlayListener({
        target: iconRef,
        overlay: overlayRef,
        listener: (event, { type, valid }) => {
            if (valid) {
                type === 'outside' ? !selfClick.current && !isTargetClicked(event.target) && hide() : hide();
            }

            selfClick.current = false;
        },
        when: overlayVisibleState
    });

    const hasFilter = () => {
        if (!filterStoreModel || !filterModel) return false;

        return filterStoreModel.operator ? !isFilterBlank(filterModel.constraints[0].value) : !isFilterBlank(filterModel.value);
    };

    const hasRowFilter = () => {
        return filterModel && !isFilterBlank(filterModel.value);
    };

    const isFilterBlank = (filter) => {
        return ObjectUtils.isEmpty(filter);
    };

    const isRowMatchModeSelected = (matchMode) => {
        return filterModel && filterModel.matchMode === matchMode;
    };

    const showMenuButton = () => {
        return getColumnProp('showFilterMenu') && (props.display === 'row' ? getColumnProp('dataType') !== 'boolean' : true);
    };

    const matchModes = () => {
        return getColumnProp('filterMatchModeOptions') || filterMatchModeOptions[findDataType()].map((key) => ({ label: localeOption(key), value: key }));
    };

    const isShowMatchModes = () => {
        return getColumnProp('dataType') !== 'boolean' && getColumnProp('showFilterMatchModes') && matchModes() && getColumnProp('showFilterMenuOptions');
    };

    const isShowOperator = () => {
        return getColumnProp('showFilterOperator') && filterModel && filterModel.operator && getColumnProp('showFilterMenuOptions');
    };

    const showRemoveIcon = () => {
        return fieldConstraints().length > 1;
    };

    const isShowAddConstraint = () => {
        return getColumnProp('showAddButton') && filterModel && filterModel.operator && fieldConstraints() && fieldConstraints().length < getColumnProp('maxConstraints') && getColumnProp('showFilterMenuOptions');
    };

    const isOutsideClicked = (target) => {
        return !isTargetClicked(target) && overlayRef.current && !(overlayRef.current.isSameNode(target) || overlayRef.current.contains(target));
    };

    const isTargetClicked = (target) => {
        return iconRef.current && (iconRef.current.isSameNode(target) || iconRef.current.contains(target));
    };

    const getDefaultConstraint = () => {
        if (filterStoreModel) {
            if (filterStoreModel.operator) {
                return {
                    matchMode: filterStoreModel.constraints[0].matchMode,
                    operator: filterStoreModel.operator
                };
            } else {
                return {
                    matchMode: filterStoreModel.matchMode
                };
            }
        }
    };

    const findDataType = () => {
        const dataType = getColumnProp('dataType');
        const matchMode = getColumnProp('filterMatchMode');
        const hasMatchMode = (key) => filterMatchModeOptions[key].some((mode) => mode === matchMode);

        if (matchMode === 'custom' && !hasMatchMode(dataType)) {
            filterMatchModeOptions[dataType].push(FilterMatchMode.CUSTOM);

            return dataType;
        } else if (matchMode) {
            return Object.keys(filterMatchModeOptions).find((key) => hasMatchMode(key)) || dataType;
        }

        return dataType;
    };

    const clearFilter = () => {
        const filterClearCallback = getColumnProp('onFilterClear');
        const defaultConstraint = getDefaultConstraint();
        let filters = { ...props.filters };

        if (filters[field].operator) {
            filters[field].constraints.splice(1);
            filters[field].operator = defaultConstraint.operator;
            filters[field].constraints[0] = { value: null, matchMode: defaultConstraint.matchMode };
        } else {
            filters[field].value = null;
            filters[field].matchMode = defaultConstraint.matchMode;
        }

        filterClearCallback && filterClearCallback();
        props.onFilterChange(filters);
        props.onFilterApply();
        hide();
    };

    const applyFilter = () => {
        const filterApplyClickCallback = getColumnProp('onFilterApplyClick');

        filterApplyClickCallback && filterApplyClickCallback({ field, constraints: filterModel });
        props.onFilterApply();
        hide();
    };

    const toggleMenu = () => {
        setOverlayVisibleState((prevVisible) => !prevVisible);
    };

    const onToggleButtonKeyDown = (event) => {
        switch (event.key) {
            case 'Escape':
            case 'Tab':
                hide();
                break;

            case 'ArrowDown':
                if (overlayVisibleState) {
                    const focusable = DomHandler.getFirstFocusableElement(overlayRef.current);

                    focusable && focusable.focus();
                    event.preventDefault();
                } else if (event.altKey) {
                    setOverlayVisibleState(true);
                    event.preventDefault();
                }

                break;

            default:
                break;
        }
    };

    const onContentKeyDown = (event) => {
        if (event.key === 'Escape') {
            hide();
            iconRef.current && iconRef.current.focus();
        }
    };

    const onInputChange = (event, index) => {
        let filters = { ...props.filters };
        let value = event.target.value;

        if (props.display === 'menu') {
            filters[field].constraints[index].value = value;
        } else {
            filters[field].value = value;
        }

        props.onFilterChange(filters);

        if (!getColumnProp('showApplyButton') || props.display === 'row') {
            props.onFilterApply();
        }
    };

    const onInputKeydown = (event, _index) => {
        if (event.key === 'Enter') {
            if (!getColumnProp('showApplyButton') || props.display === 'menu') {
                applyFilter();
            }
        }
    };

    const onRowMatchModeChange = (matchMode) => {
        const filterMatchModeChangeCallback = getColumnProp('onFilterMatchModeChange');
        let filters = { ...props.filters };

        filters[field].matchMode = matchMode;

        filterMatchModeChangeCallback && filterMatchModeChangeCallback({ field, matchMode });
        props.onFilterChange(filters);
        props.onFilterApply();
        hide();
    };

    const onRowMatchModeKeyDown = (event, matchMode, clear) => {
        let item = event.target;

        switch (event.key) {
            case 'ArrowDown':
                const nextItem = findNextItem(item);

                if (nextItem) {
                    item.removeAttribute('tabindex');
                    nextItem.tabIndex = 0;
                    nextItem.focus();
                }

                event.preventDefault();
                break;

            case 'ArrowUp':
                const prevItem = findPrevItem(item);

                if (prevItem) {
                    item.removeAttribute('tabindex');
                    prevItem.tabIndex = 0;
                    prevItem.focus();
                }

                event.preventDefault();
                break;

            case 'Enter':
                clear ? clearFilter() : onRowMatchModeChange(matchMode.value);

                event.preventDefault();
                break;

            default:
                break;
        }
    };

    const onOperatorChange = (e) => {
        const filterOperationChangeCallback = getColumnProp('onFilterOperatorChange');
        let value = e.value;
        let filters = { ...props.filters };

        filters[field].operator = value;
        props.onFilterChange(filters);

        filterOperationChangeCallback && filterOperationChangeCallback({ field, operator: value });

        if (!getColumnProp('showApplyButton')) {
            props.onFilterApply();
        }
    };

    const onMenuMatchModeChange = (value, index) => {
        const filterMatchModeChangeCallback = getColumnProp('onFilterMatchModeChange');
        let filters = { ...props.filters };

        filters[field].constraints[index].matchMode = value;
        props.onFilterChange(filters);
        filterMatchModeChangeCallback && filterMatchModeChangeCallback({ field, matchMode: value, index: index });

        if (!getColumnProp('showApplyButton')) {
            props.onFilterApply();
        }
    };

    const addConstraint = () => {
        const filterConstraintAddCallback = getColumnProp('onFilterConstraintAdd');
        const defaultConstraint = getDefaultConstraint();
        let filters = { ...props.filters };
        let newConstraint = { value: null, matchMode: defaultConstraint.matchMode };

        filters[field].constraints.push(newConstraint);
        filterConstraintAddCallback && filterConstraintAddCallback({ field, constraint: newConstraint });
        props.onFilterChange(filters);

        if (!getColumnProp('showApplyButton')) {
            props.onFilterApply();
        }
    };

    const removeConstraint = (index) => {
        const filterConstraintRemoveCallback = getColumnProp('onFilterConstraintRemove');
        let filters = { ...props.filters };
        let removedConstraint = filters[field].constraints.splice(index, 1);

        filterConstraintRemoveCallback && filterConstraintRemoveCallback({ field, constraint: removedConstraint });
        props.onFilterChange(filters);

        if (!getColumnProp('showApplyButton')) {
            props.onFilterApply();
        }
    };

    const findNextItem = (item) => {
        const nextItem = item.nextElementSibling;

        return nextItem ? (DomHandler.hasClass(nextItem, 'p-column-filter-separator') ? findNextItem(nextItem) : nextItem) : item.parentElement.firstElementChild;
    };

    const findPrevItem = (item) => {
        const prevItem = item.previousElementSibling;

        return prevItem ? (DomHandler.hasClass(prevItem, 'p-column-filter-separator') ? findPrevItem(prevItem) : prevItem) : item.parentElement.lastElementChild;
    };

    const hide = () => {
        setOverlayVisibleState(false);
    };

    const onContentClick = (event) => {
        selfClick.current = true;

        OverlayService.emit('overlay-click', {
            originalEvent: event,
            target: overlayRef.current
        });
    };

    const onContentMouseDown = () => {
        selfClick.current = true;
    };

    const onOverlayEnter = () => {
        ZIndexUtils.set('overlay', overlayRef.current, autoZIndex, zIndex['overlay']);
        DomHandler.alignOverlay(overlayRef.current, iconRef.current, appendTo, false);

        overlayEventListener.current = (e) => {
            if (!isOutsideClicked(e.target)) {
                selfClick.current = true;
            }
        };

        OverlayService.on('overlay-click', overlayEventListener.current);
    };

    const onOverlayEntered = () => {
        bindOverlayListener();
    };

    const onOverlayExit = () => {
        onOverlayHide();
    };

    const onOverlayExited = () => {
        ZIndexUtils.clear(overlayRef.current);
    };

    const onOverlayHide = () => {
        unbindOverlayListener();
        OverlayService.off('overlay-click', overlayEventListener.current);
        overlayEventListener.current = null;
        selfClick.current = false;
    };

    const fieldConstraints = () => {
        return filterModel ? filterModel.constraints || [filterModel] : [];
    };

    const operator = () => {
        return filterModel.operator;
    };

    const operatorOptions = () => {
        return [
            { label: localeOption('matchAll'), value: FilterOperator.AND },
            { label: localeOption('matchAny'), value: FilterOperator.OR }
        ];
    };

    const filterLabel = () => {
        return localeOption('filter');
    };

    const noFilterLabel = () => {
        return localeOption('noFilter');
    };

    const removeRuleButtonLabel = () => {
        return localeOption('removeRule');
    };

    const addRuleButtonLabel = () => {
        return localeOption('addRule');
    };

    const clearButtonLabel = () => {
        return localeOption('clear');
    };

    const applyButtonLabel = () => {
        return localeOption('apply');
    };

    const filterCallback = (value, index = 0) => {
        let filters = { ...props.filters };
        let meta = filters[field];

        props.display === 'menu' && meta && meta.operator ? (filters[field].constraints[index].value = value) : (filters[field].value = value);
        props.onFilterChange(filters);
    };

    const filterApplyCallback = (...args) => {
        args && filterCallback(args[0], args[1]);

        props.onFilterApply();
    };

    useUpdateEffect(() => {
        if (props.display === 'menu' && overlayVisibleState) {
            DomHandler.alignOverlay(overlayRef.current, iconRef.current, appendTo, false);
        }
    });

    useUnmountEffect(() => {
        if (overlayEventListener.current) {
            OverlayService.off('overlay-click', overlayEventListener.current);
            overlayEventListener.current = null;
        }

        if (overlayRef.current) {
            ZIndexUtils.clear(overlayRef.current);
            onOverlayHide();
        }
    });

    const createFilterElement = (model, index) => {
        const value = model ? model.value : null;

        return getColumnProp('filterElement') ? (
            ObjectUtils.getJSXElement(getColumnProp('filterElement'), { field, index, filterModel: model, value, filterApplyCallback, filterCallback })
        ) : (
            <InputText
                type={getColumnProp('filterType')}
                value={value || ''}
                onChange={(e) => onInputChange(e, index)}
                onKeyDown={(e) => onInputKeydown(e, index)}
                className="p-column-filter"
                placeholder={getColumnProp('filterPlaceholder')}
                maxLength={getColumnProp('filterMaxLength')}
            />
        );
    };

    const createRowFilterElement = () => {
        if (props.display === 'row') {
            const content = createFilterElement(filterModel, 0);
            const filterInputProps = mergeProps(
                {
                    className: 'p-fluid p-column-filter-element'
                },
                getColumnPTOptions('filterInput')
            );

            return <div {...filterInputProps}>{content}</div>;
        }

        return null;
    };

    const createMenuFilterElement = (fieldConstraint, index) => {
        return props.display === 'menu' ? createFilterElement(fieldConstraint, index) : null;
    };

    const createMenuButton = () => {
        if (showMenuButton()) {
            const filterIconProps = mergeProps(
                {
                    'aria-hidden': true
                },
                getColumnPTOptions('filterIcon')
            );
            const icon = props.filterIcon || <FilterIcon {...filterIconProps} />;
            const columnFilterIcon = IconUtils.getJSXIcon(icon, { ...filterIconProps }, { props });

            const className = classNames('p-column-filter-menu-button p-link', {
                'p-column-filter-menu-button-open': overlayVisibleState,
                'p-column-filter-menu-button-active': hasFilter()
            });
            const label = filterLabel();
            const filterMenuButtonProps = mergeProps(
                {
                    ref: iconRef,
                    type: 'button',
                    className,
                    'aria-haspopup': true,
                    'aria-expanded': overlayVisibleState,
                    onClick: (e) => toggleMenu(e),
                    onKeyDown: (e) => onToggleButtonKeyDown(e),
                    'aria-label': label
                },
                getColumnPTOptions('filterMenuButton')
            );

            return (
                <button {...filterMenuButtonProps}>
                    {columnFilterIcon}
                    <Ripple />
                </button>
            );
        }

        return null;
    };

    const createClearButton = () => {
        const filterClearIconProps = mergeProps(
            {
                'aria-hidden': true
            },
            getColumnPTOptions('filterClearIcon')
        );
        const icon = props.filterClearIcon || <FilterSlashIcon {...filterClearIconProps} />;
        const filterClearIcon = IconUtils.getJSXIcon(icon, { ...filterClearIconProps }, { props });

        if (getColumnProp('showClearButton') && props.display === 'row') {
            const className = classNames('p-column-filter-clear-button p-link', {
                'p-hidden-space': !hasRowFilter()
            });
            const clearLabel = clearButtonLabel();
            const headerFilterClearButtonProps = mergeProps(
                {
                    className,
                    type: 'button',
                    onClick: (e) => clearFilter(e),
                    'aria-label': clearLabel
                },
                getColumnPTOptions('headerFilterClearButton')
            );

            return (
                <button {...headerFilterClearButtonProps}>
                    {filterClearIcon}
                    <Ripple />
                </button>
            );
        }

        return null;
    };

    const createRowItems = () => {
        if (isShowMatchModes()) {
            const _matchModes = matchModes();
            const _noFilterLabel = noFilterLabel();
            const filterSeparatorProps = mergeProps(
                {
                    className: 'p-column-filter-separator'
                },
                getColumnPTOptions('filterSeparator')
            );

            const filterRowItemProps = mergeProps(
                {
                    className: 'p-column-filter-row-item',
                    onClick: (e) => clearFilter(e),
                    onKeyDown: (e) => onRowMatchModeKeyDown(e, null, true)
                },
                getColumnPTOptions('filterRowItem')
            );

            const filterRowItemsProps = mergeProps(
                {
                    className: 'p-column-filter-row-items'
                },
                getColumnPTOptions('filterRowItems')
            );

            return (
                <ul {...filterRowItemsProps}>
                    {_matchModes.map((matchMode, i) => {
                        const { value, label } = matchMode;
                        const className = classNames('p-column-filter-row-item', { 'p-highlight': isRowMatchModeSelected(value) });
                        const tabIndex = i === 0 ? 0 : null;
                        const filterRowItemProps = mergeProps(
                            {
                                className,
                                onClick: () => onRowMatchModeChange(value),
                                onKeyDown: (e) => onRowMatchModeKeyDown(e, matchMode),
                                tabIndex
                            },
                            getColumnPTOptions('filterRowItem')
                        );

                        return (
                            <li {...filterRowItemProps} key={label}>
                                {label}
                            </li>
                        );
                    })}
                    <li {...filterSeparatorProps}></li>
                    <li {...filterRowItemProps}>{_noFilterLabel}</li>
                </ul>
            );
        }

        return null;
    };

    const createOperator = () => {
        if (isShowOperator()) {
            const options = operatorOptions();
            const value = operator();
            const filterOperatorProps = mergeProps(
                {
                    className: 'p-column-filter-operator'
                },
                getColumnPTOptions('filterOperator')
            );

            return (
                <div {...filterOperatorProps}>
                    <Dropdown options={options} value={value} onChange={onOperatorChange} className="p-column-filter-operator-dropdown" pt={getColumnPTOptions('filterOperatorDropdown')} />
                </div>
            );
        }

        return null;
    };

    const createMatchModeDropdown = (constraint, index) => {
        if (isShowMatchModes()) {
            const options = matchModes();

            return <Dropdown options={options} value={constraint.matchMode} onChange={(e) => onMenuMatchModeChange(e.value, index)} className="p-column-filter-matchmode-dropdown" pt={getColumnPTOptions('filterMatchModeDropdown')} />;
        }

        return null;
    };

    const createRemoveButton = (index) => {
        if (showRemoveIcon()) {
            const removeRuleLabel = removeRuleButtonLabel();

            return (
                <Button
                    type="button"
                    icon={props.filterRemoveIcon || <TrashIcon />}
                    className="p-column-filter-remove-button p-button-text p-button-danger p-button-sm"
                    onClick={() => removeConstraint(index)}
                    label={removeRuleLabel}
                    pt={getColumnPTOptions('filterRemoveButton')}
                />
            );
        }

        return null;
    };

    const createConstraints = () => {
        const _fieldConstraints = fieldConstraints();
        const filterConstraintsProps = mergeProps(
            {
                className: 'p-column-filter-constraints'
            },
            getColumnPTOptions('filterConstraints')
        );

        const filterConstraintProps = mergeProps(
            {
                className: 'p-column-filter-constraint'
            },
            getColumnPTOptions('filterConstraint')
        );

        return (
            <div {...filterConstraintsProps}>
                {_fieldConstraints.map((fieldConstraint, i) => {
                    const matchModeDropdown = createMatchModeDropdown(fieldConstraint, i);
                    const menuFilterElement = createMenuFilterElement(fieldConstraint, i);
                    const removeButton = createRemoveButton(i);
                    const filterRemoveProps = mergeProps(getColumnPTOptions('filterRemove'));

                    return (
                        <div {...filterConstraintProps} key={i}>
                            {matchModeDropdown}
                            {menuFilterElement}
                            <div {...filterRemoveProps}>{removeButton}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const createAddRule = () => {
        if (isShowAddConstraint()) {
            const addRuleLabel = addRuleButtonLabel();
            const filterAddRuleProps = mergeProps(
                {
                    className: 'p-column-filter-add-rule'
                },
                getColumnPTOptions('filterAddRule')
            );

            return (
                <div {...filterAddRuleProps}>
                    <Button type="button" label={addRuleLabel} icon={props.filterAddIcon || <PlusIcon />} className="p-column-filter-add-button p-button-text p-button-sm" onClick={addConstraint} pt={getColumnPTOptions('filterAddRuleButton')} />
                </div>
            );
        }

        return null;
    };

    const createFilterClearButton = () => {
        if (getColumnProp('showClearButton')) {
            if (!getColumnProp('filterClear')) {
                const clearLabel = clearButtonLabel();

                return <Button type="button" className="p-button-outlined p-button-sm" onClick={clearFilter} label={clearLabel} pt={getColumnPTOptions('filterClearButton')} />;
            }

            return ObjectUtils.getJSXElement(getColumnProp('filterClear'), { field, filterModel, filterClearCallback: clearFilter });
        }

        return null;
    };

    const createFilterApplyButton = () => {
        if (getColumnProp('showApplyButton')) {
            if (!getColumnProp('filterApply')) {
                const applyLabel = applyButtonLabel();

                return <Button type="button" className="p-button-sm" onClick={applyFilter} label={applyLabel} pt={getColumnPTOptions('filterApplyButton')} />;
            }

            return ObjectUtils.getJSXElement(getColumnProp('filterApply'), { field, filterModel, filterApplyCallback: applyFilter });
        }

        return null;
    };

    const createButtonBar = () => {
        const clearButton = createFilterClearButton();
        const applyButton = createFilterApplyButton();
        const filterButtonbarProps = mergeProps(
            {
                className: 'p-column-filter-buttonbar'
            },
            getColumnPTOptions('filterButtonBar')
        );

        return (
            <div {...filterButtonbarProps}>
                {clearButton}
                {applyButton}
            </div>
        );
    };

    const createItems = () => {
        const operator = createOperator();
        const constraints = createConstraints();
        const addRule = createAddRule();
        const buttonBar = createButtonBar();

        return (
            <>
                {operator}
                {constraints}
                {addRule}
                {buttonBar}
            </>
        );
    };

    const createOverlay = () => {
        const style = getColumnProp('filterMenuStyle');
        const className = classNames('p-column-filter-overlay p-component p-fluid', getColumnProp('filterMenuClassName'), {
            'p-column-filter-overlay-menu': props.display === 'menu',
            'p-input-filled': inputStyle === 'filled',
            'p-ripple-disabled': ripple === false
        });
        const filterHeader = ObjectUtils.getJSXElement(getColumnProp('filterHeader'), { field, filterModel, filterApplyCallback });
        const filterFooter = ObjectUtils.getJSXElement(getColumnProp('filterFooter'), { field, filterModel, filterApplyCallback });
        const items = props.display === 'row' ? createRowItems() : createItems();
        const filterOverlayProps = mergeProps(
            {
                ref: overlayRef,
                style,
                className,
                onKeyDown: (e) => onContentKeyDown(e),
                onClick: (e) => onContentClick(e),
                onMouseDown: (e) => onContentMouseDown(e)
            },
            getColumnPTOptions('filterOverlay')
        );

        return (
            <Portal>
                <CSSTransition
                    nodeRef={overlayRef}
                    classNames="p-connected-overlay"
                    in={overlayVisibleState}
                    timeout={{ enter: 120, exit: 100 }}
                    unmountOnExit
                    onEnter={onOverlayEnter}
                    onEntered={onOverlayEntered}
                    onExit={onOverlayExit}
                    onExited={onOverlayExited}
                >
                    <div {...filterOverlayProps}>
                        {filterHeader}
                        {items}
                        {filterFooter}
                    </div>
                </CSSTransition>
            </Portal>
        );
    };

    const className = classNames('p-column-filter p-fluid', {
        'p-column-filter-row': props.display === 'row',
        'p-column-filter-menu': props.display === 'menu'
    });
    const rowFilterElement = createRowFilterElement();
    const menuButton = createMenuButton();
    const clearButton = createClearButton();
    const overlay = createOverlay();
    const columnFilter = mergeProps(
        {
            className
        },
        getColumnPTOptions('columnFilter')
    );

    return (
        <div {...columnFilter}>
            {rowFilterElement}
            {menuButton}
            {clearButton}
            {overlay}
        </div>
    );
});

ColumnFilter.displayName = 'ColumnFilter';
