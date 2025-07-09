import React, { useState, useEffect, useRef } from "react";
import { SidePanel } from "@egovernments/digit-ui-components";
import { Card } from "@egovernments/digit-ui-react-components";
import InfiniteCanvas from "../../components/Canvas";
import { useTranslation } from "react-i18next";
import { FieldV1 } from "@egovernments/digit-ui-components";
import WorkflowNode from "../../components/WorkflowNode";
import { Button } from "@egovernments/digit-ui-components";
import { Toast } from "@egovernments/digit-ui-react-components";
import StateComp from "../../components/StateComponent";

const Workflow = () => {
    const { t } = useTranslation();
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState([]);
    const [coords, setCoords] = useState([{ x: 100, y: 300 }]);
    const [showToast, setShowToast] = useState(null);
    const [hasStart, setHasStart] = useState(false);

    const [stateData, setStateData] = useState({
        name: "",
        desc: "",
    });

    const onLeftClick = () => {
        console.log("left button is clicked");
    }

    const onRightClick = () => {
        console.log("right button is clicked");
    }

    const DeleteClick = (elementId, e) => {
        setCanvasElements(prev => {
            return prev.filter(element => element.id !== elementId);
        });

        if (selectedElement && selectedElement.id === elementId) {
            setSelectedElement(null);
            setStateData({ name: "", desc: "" });
        }
    }

    const EditClick = (id, e) => {
        const element = canvasElements.find(el => el.id === id);
        if (element) {
            handleElementClick(element);
        }
    }

    // Function to create WorkflowNode component
    const createWorkflowNode = (element) => {
        return (
            <WorkflowNode
                type={element.type}
                elementId={element.id}
                State={element.name}
                desc={element.desc}
                nodetype={element.nodetype}
                onLeftAction={onLeftClick}
                onRightAction={onRightClick}
                onDeleteAction={DeleteClick}
                onEditAction={EditClick}
            />
        );
    };

    const AddState = (state) => {

        const currentX = coords[0].x;
        const currentY = coords[0].y;

        let type, nodetype, name, desc;

        if (state === "start") {
            type = "node";
            nodetype = "start";
            name = t("START");
            desc = t("INITIAL_STATE");
        } else if (state === "end") {
            type = "node";
            nodetype = "end";
            name = t("END");
            desc = t("FINAL_STATE");
        } else {
            type = "node";
            nodetype = "intermediate";
            name = t("PROCESSING");
            desc = t("INTERMEDIATE_STATE");
        }

        const elementId = Date.now();

        const newElement = {
            id: elementId,
            type: type,
            name: name,
            desc: desc,
            nodetype: nodetype,
            position: { x: currentX, y: currentY }
        };

        setCanvasElements(prev => [...prev, newElement]);
        setCoords([{ x: currentX + 265, y: currentY }]);
    };

    const onDataChange = (e) => {
        const { name, value } = e.target;
        setStateData(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleElementClick = (element) => {
        setSelectedElement(element);
        setStateData({ name: element.name, desc: element.desc});
    }

    const handleElementDrag = (element, newPosition) => {
        setCanvasElements(prev =>
            prev.map(el => el.id === element.id ? { ...el, position: newPosition } : el)
        );
    };

    const updateProperties = () => {

        setCanvasElements(prev =>
            prev.map(element => {
                if (element.id === selectedElement.id) {
                    const updatedElement = {
                        ...element,
                        name: stateData.name,
                        desc: stateData.desc,
                    };
                    setSelectedElement(updatedElement);
                    return updatedElement;
                }
                return element;
            })
        );

        setStateData({ name: "", desc: "" });
    }

    const elementsWithComponents = canvasElements.map(element => ({
        ...element,
        component: createWorkflowNode(element)
    }));

    const Workflow_Sections = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{t("WORKFLOW_COMPONENT")}</div>
                <div className="state-description">{t("WORKFLOW_DESCRIPTION")}</div>
            </div>
        ],
        [
            <div>
                <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                    <div >{t("WORKFLOW_STATES")}</div>
                </div>
            </div>,
            <StateComp
                onStateClick={() => AddState("start")}
                type={"start"}
                State={t("START_STATE")}
                desc={t("START_STATE_DESC")}
                disabled={hasStart}
            />,
            <StateComp
                onStateClick={() => AddState("intermediate")}
                type={"intermediate"}
                State={t("INTER_STATE")}
                desc={t("INTER_STATE_DESC")}
            />,
            <StateComp
                onStateClick={() => AddState("end")}
                type={"end"}
                State={t("END_STATE")}
                desc={t("END_STATE_DESC")}
            />
        ],
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{t("HOW_TO_CONNECT")}</div>
            </div>
        ],
    ];

    const Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{t("PROPERTIES")}</div>
            </div>,
        ],
        []
    ]

    const Node_Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{t("PROPERTIES")}</div>
            </div>,
        ],
        [
            <FieldV1
                error=""
                label={t("STATE_NAME")}
                onChange={onDataChange}
                populators={{
                    name: "name",
                    alignFieldPairVerically: true,
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                required
                type="text"
                value={stateData.name}
            />,
            <FieldV1
                error=""
                label={t("DESCRIPTION")}
                onChange={onDataChange}
                populators={{
                    name: "desc",
                    alignFieldPairVerically: true,
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                required
                type="text"
                value={stateData.desc}
            />,
            <Button
                variation="primary"
                label={t("UPDATE_PROPERTIES")}
                type="button"
                size={"large"}
                style={{ width: "100%" }}
                onClick={updateProperties}
            />,
            <Button
                variation="secondary"
                label={t("DELETE_STATE")}
                type="button"
                style={{ width: "100%" }}
                onClick={(e) => DeleteClick(selectedElement?.id, e)}
            />
        ]
    ]

    useEffect(() => {
        const foundStart = canvasElements.some(
            (el) => el.nodetype === "start"
        );
        setHasStart(foundStart);
    }, [canvasElements]);

    return (
        <Card style={{ flex: 1, marginRight: "1rem", border: '0.063rem solid #d6d5d4' }} className="Workflow-card">
            {showToast && (
                <Toast
                    type={showToast.type}
                    message={showToast.message}
                    onClose={() => setShowToast(null)}
                />
            )}
            <Card className="Workflow-card">
                <SidePanel
                    type="static"
                    position="left"
                    isDraggable={true}
                    sections={Workflow_Sections}
                    defaultOpenWidth={330}
                    addClose={true}
                    isOverlay={false}
                    hideScrollIcon={true}
                    hideArrow={false}
                    className="slider-container"
                />
            </Card>
            <InfiniteCanvas
                elements={elementsWithComponents}
                onElementClick={handleElementClick}
                onElementDrag={handleElementDrag}
            />
            <Card className="properties-panel Workflow-card">
                <SidePanel
                    type="static"
                    position="left"
                    isDraggable={true}
                    sections={selectedElement?.type === "node" ? Node_Properties_Section : Properties_Section}
                    defaultOpenWidth={400}
                    addClose={true}
                    isOverlay={false}
                    hideScrollIcon={true}
                    hideArrow={false}
                    className="slider-container"
                />
            </Card>
        </Card>
    );
};

export default Workflow;