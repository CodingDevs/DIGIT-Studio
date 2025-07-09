import React, { useState, useEffect, useRef } from "react";
import { SidePanel } from "@egovernments/digit-ui-components";
import { Card } from "@egovernments/digit-ui-react-components";
import InfiniteCanvas from "../../components/Canvas";
import { FieldV1 } from "@egovernments/digit-ui-components";
import WorkflowNode from "../../components/WorkflowNode";
import { Button } from "@egovernments/digit-ui-components";
import { Toast } from "@egovernments/digit-ui-react-components";
import StateComp from "../../components/StateComponent";

const Workflow = () => {
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
        console.log("edit action is clicked", id);
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
        console.log(state, "is Clicked");

        const currentX = coords[0].x;
        const currentY = coords[0].y;

        let type, nodetype, name, desc;

        if (state === "start") {
            type = "node";
            nodetype = "start";
            name = "Start";
            desc = "Initial State";
        } else if (state === "end") {
            type = "node";
            nodetype = "end";
            name = "End";
            desc = "Final State";
        } else {
            type = "node";
            nodetype = "intermediate";
            name = "Processing";
            desc = "Intermediate State";
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
        console.log(e,"onchange");
        const { name, value } = e.target;
        setStateData(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleElementClick = (element) => {
        console.log("Element clicked:", element?.type);
        setSelectedElement(element);
        setStateData({ name: element.name, desc: element.desc});
    }

    const handleElementDrag = (element, newPosition) => {
        setCanvasElements(prev =>
            prev.map(el => el.id === element.id ? { ...el, position: newPosition } : el)
        );
    };

    const updateProperties = () => {
        console.log("Updating properties for element:", selectedElement.id);

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
                <div>Workflow Components</div>
                <div className="state-description">Click states to add to your workflow</div>
            </div>
        ],
        [
            <div>
                <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                    <div >States</div>
                    <div className="state-description">Add workflow states and connect with actions</div>
                </div>
            </div>,
            <StateComp
                onStateClick={() => AddState("start")}
                type={"start"}
                State={"Start State"}
                desc={"Initial workflow state"}
                disabled={hasStart}
            />,
            <StateComp
                onStateClick={() => AddState("intermediate")}
                type={"intermediate"}
                State={"Process State"}
                desc={"Intermediate workflow state"}
            />,
            <StateComp
                onStateClick={() => AddState("end")}
                type={"end"}
                State={"End State"}
                desc={"Final workflow state"}
            />
        ],
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>How to Connect</div>
            </div>
        ],
    ];

     const Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>Properties</div>
            </div>,
        ],
        []
    ]

    const Node_Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>Properties</div>
            </div>,
        ],
        [
            <FieldV1
                error=""
                label="State Name"
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
                label="Description"
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
                label={"Update Properties"}
                type="button"
                size={"large"}
                style={{ width: "100%" }}
                onClick={updateProperties}
            />,
            <Button
                variation="secondary"
                label={"Delete State"}
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
                    sections={selectedElement?.type=="node"? Node_Properties_Section: Properties_Section}
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