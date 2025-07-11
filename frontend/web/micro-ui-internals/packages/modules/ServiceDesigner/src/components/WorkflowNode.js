import React from "react";
import { CustomSVG } from "@egovernments/digit-ui-components";

const WorkflowNode = ({
  type,
  State,
  desc,
  elementId,
  icon,
  nodetype,
  roles,
  sla,
  onLeftAction,
  onRightAction,
  onEditAction,
  onDeleteAction,
  leftButtonTooltip = "Left Action",
  rightButtonTooltip = "Right Action",
  editButtonTooltip = "Edit Action",
  deleteButtonTooltip = "Delete Action"
}) => {

  const handleLeftClick = (elementId, e) => {
    e.stopPropagation();
    if (onLeftAction) onLeftAction(elementId, e);
  };

  const handleRightClick = (elementId, e) => {
    e.stopPropagation();
    if (onRightAction) onRightAction(elementId, e);
  };

  const handleEditClick = (elementId, e) => {
    e.stopPropagation();
    onEditAction(elementId, e);
  }

  const handleDeleteClick = (elementId, e) => {
    e.stopPropagation();
    onDeleteAction(elementId,e);
  }

  return (
    <div className="card-container">
      {/* Top right buttons - Edit and Remove */}
      <div className="top-actions">
        {/* Edit Button */}
        {onEditAction && (
          <button
            onClick={(e) => handleEditClick(elementId, e)}
            title={editButtonTooltip}
            className="node-buttons"
          >
            <CustomSVG.EditIcon />
          </button>
        )}

        {/* Remove Button */}
        {onDeleteAction && (
          <button
            onClick={(e)=>handleDeleteClick(elementId,e)}
            title={deleteButtonTooltip}
            className="node-buttons"
          >
            <CustomSVG.CloseSvg />
          </button>
        )}
      </div>
      <div className="state-card" style={{ height: "100px", paddingTop: "25px", width: "215px" }}>
        {/* Left Action Button */}
        {onLeftAction && (
          <button
            className="action-button left-action"
            onClick={(e) => handleLeftClick(elementId, e)}
            title={leftButtonTooltip}
          >
          </button>
        )}

        <div className="state-card-content">
          <div className="state-icon">
            {icon || <CustomSVG.EditIcon />}
          </div>
          <div className="text-section">
            <h3 className="state-title">{State}</h3>
            <p className="state-description">{desc}</p>
          </div>
        </div>

        {/* Right Action Button */}
        {onRightAction && (
          <button
            className="action-button right-action"
            onClick={(e) => handleRightClick(elementId, e)}
            title={rightButtonTooltip}
          >
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowNode;