import React from "react";
import { CustomSVG } from "@egovernments/digit-ui-components";

const WorkflowNode = ({
  type,
  State,
  desc,
  elementId,
  icon,
  nodetype,
  onLeftAction,
  onRightAction,
  onEditAction,
  onDeleteAction,
  leftButtonTooltip = "Left Action",
  rightButtonTooltip = "Right Action",
  editButtonTooltip = "Edit Action",
  deleteButtonTooltip = "Delete Action"
}) => {

  const handleLeftClick = (e) => {
    e.stopPropagation();
    if (onLeftAction) onLeftAction();
  };

  const handleRightClick = (e) => {
    e.stopPropagation();
    if (onRightAction) onRightAction();
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
            onClick={handleLeftClick}
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
            onClick={handleRightClick}
            title={rightButtonTooltip}
          >
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowNode;