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
import { Loader } from "@egovernments/digit-ui-react-components";
import QuickStart from "../../components/QuickStart";
import StageActions from "../../components/StageActions";

const Workflow = () => {
    const { t } = useTranslation();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState([]);
    const [coords, setCoords] = useState([{ x: 100, y: 300 }]);
    const [showToast, setShowToast] = useState(null);
    const [hasStart, setHasStart] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);
    const [connections, setConnections] = useState([]);
    const [connecting, setConnecting] = useState(null);

    const master = { name: "roles" };
    const { isLoading, data } = window?.Digit?.Hooks.useCustomMDMS(Digit?.ULBService?.getStateId(), "ACCESSCONTROL-ROLES", [master], {
        select: undefined
            ? createFunction(config?.mdmsConfig?.select)
            : (data) => {
                const optionsData = _.get(data, `${"ACCESSCONTROL-ROLES"}.${"roles"}`, []);
                return optionsData
                    .filter((opt) => (opt?.hasOwnProperty("active") ? opt.active : true))
                    .map((opt) => ({ ...opt, name: `${undefined}_${Digit.Utils.locale.getTransformedLocale(opt.code)}` }));
            },
        enabled: (true) ? true : false,
    }, [master]);

    const requestCriteria = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "Studio.Checklists"
            },
        },
    };
    const { isLoading: moduleListLoading, data: dataa } = Digit.Hooks.useCustomAPIHook(requestCriteria);
    const checklistData = dataa?.mdms?.map((item) => ({
        code: item.data.name,
        name: item.data.name,
    }));

    const [stateData, setStateData] = useState({
        name: "",
        desc: "",
        roles: [],
        sla: 0,
    });

    const [actionData, setActionData] = useState({
        label: "",
        desc: "",
        aroles: [],
    });

    const onLeftClick = (elementId, e) => {
        if (connectionStart && connectionStart !== elementId) {
            setConnections((prev) => [
                ...prev,
                { id: Date.now(), from: connectionStart, to: elementId, label: "Action", type: "action", desc: "" }
            ]);
            setConnectionStart(null);
        }
        setConnecting(null);
    }

    const onRightClick = (elementId, e) => {
        setConnectionStart(elementId);
    }

    const DeleteClick = (elementId, e) => {
        setCanvasElements(prev => {
            return prev.filter(element => element.id !== elementId);
        });

        if (selectedElement && selectedElement.id === elementId) {
            setSelectedElement(null);
            setStateData({ name: "", desc: "", roles: [], sla: 0 });
        }
    }

    const DeleteActionClick = (id, e) => {
        setConnections(prev => { 
            return prev.filter(conn => conn.id !== id);
        });  
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement(null);
            setActionData({ label: "", desc: "", aroles: [] });
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
                roles={[]}
                sla={24}
                nodetype={element.nodetype}
                onLeftAction={onLeftClick}
                onRightAction={onRightClick}
                onDeleteAction={DeleteClick}
                onEditAction={EditClick}
            />
        );
    };

    const CanvasClick = (x, y) => {
        if (connectionStart) {
            const elementId = AddState("intermediate", x, y - 90);
            if (connectionStart && connectionStart !== elementId) {
                setConnections((prev) => [
                    ...prev,
                    { id: Date.now(), from: connectionStart, to: elementId, label: "Action", type: "action", desc: "" }
                ]);
                setConnectionStart(null);
            }
            setConnecting(null);
        }
    }

    const AddState = (state, x, y) => {

        const currentX = x || coords[0].x;
        const currentY = y || coords[0].y;

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
            roles: [],
            sla: 24,
            nodetype: nodetype,
            position: { x: currentX, y: currentY }
        };

        setCanvasElements(prev => [...prev, newElement]);
        setCoords([{ x: coords[0].x + 265, y: coords[0].y }]);
        return newElement.id;
    };

    const onDataChange = (e) => {
        if (Array.isArray(e) && e.length === 0) {
            return;
        }
        if (Array.isArray(e) && e[0]?.code) {
            setStateData(prev => ({
                ...prev,
                roles: e
            }));
        } else if (e?.target) {
            const { name, value } = e.target;
            setStateData(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setStateData(prev => ({
                ...prev,
                sla: e
            }));
        }
    };

    const onActionDataChange = (e) => {
        if (Array.isArray(e) && e[0]?.code) {
            setActionData(prev => ({
                ...prev,
                aroles: e
            }));
        } else if (e?.target) {
            const { name, value } = e.target;
            setActionData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    }

    const handleElementClick = (element) => {
        setSelectedElement(element);
        setStateData({ name: element.name, desc: element.desc, roles: element.roles, sla: element.sla });
    }

    const handleElementDrag = (element, newPosition) => {
        setCanvasElements(prev =>
            prev.map(el => el.id === element.id ? { ...el, position: newPosition } : el)
        );
    };

    const updateProperties = () => {
        if (stateData.name === "" || stateData.sla < 1) {
            setShowToast({ key: true, label: t("FILL_THE_REQUIRED_DETAILS") });
        }
        else {
            setCanvasElements(prev =>
                prev.map(element => {
                    if (element.id === selectedElement.id) {
                        const updatedElement = {
                            ...element,
                            name: stateData.name,
                            desc: stateData.desc,
                            roles: stateData.roles,
                            sla: stateData.sla,
                        };
                        setSelectedElement(updatedElement);
                        return updatedElement;
                    }
                    return element;
                })
            );

            setStateData({ name: "", desc: "", roles: [], sla: 0 });
            setSelectedElement(null);
        }

    }

    const updateActionProperties = () => {
        if (actionData.label === "") {
            setShowToast({ key: true, label: t("FILL_THE_REQUIRED_DETAILS") });
        }
        else {
            setConnections(prev =>
                prev.map(element => {
                    if (element.id === selectedElement.id) {
                        const updatedElement = {
                            ...element,
                            label: actionData.label,
                            desc: actionData.desc,
                            aroles: actionData.aroles,
                        };
                        setSelectedElement(updatedElement);
                        return updatedElement;
                    }
                    return element;
                })
            );
            setActionData({ label: "", desc: "", aroles: [] });
            setSelectedElement(null);
        }
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
            </div>,
            <QuickStart />,
            <Button
                variation="secondary"
                label={t("GET_WORKFLOW")}
                type="button"
                style={{ width: "100%" }}
                onClick={(e) => getWrorkflowData(e)}
            />
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
                error={stateData.name == "" ? t("PLEASE_ENTER_STATE_NAME") : ""}
                label={t("STATE_NAME")}
                onChange={(e) => onDataChange(e)}
                populators={{
                    name: "name",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                required
                infoMessage="this is state name field"
                type="text"
                value={stateData.name}
            />,
            <FieldV1
                label={t("DESCRIPTION")}
                onChange={onDataChange}
                placeholder={t("DESCRIPTION")}
                populators={{
                    name: "desc",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="text"
                infoMessage="this is desc field"
                value={stateData.desc}
            />,
            <FieldV1
                label={t("ROLES")}
                onChange={(e) => onDataChange(e)}
                populators={{
                    name: "roles",
                    isSearchable: true,
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    isSearchable: true,
                    options: isLoading ? [] : data.map(({ code, name }) => ({ code, name })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage="this is roles field"
                value={stateData.roles}
            />,
            <FieldV1
                error={stateData.sla < 1 ? t("PLEASE_ENTER_VALID_SLA_IN_HOURS(MIN 1)") : ""}
                label="SLA_TIMER(HOURS)"
                onChange={(e) => onDataChange(e)}
                populators={{
                    name: "sla",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                required
                type="numeric"
                infoMessage="this is sla field"
                value={stateData.sla}
            />,
            selectedElement?.nodetype == "start" ? (<FieldV1
                label={t("SERVICE_REQUEST_FORM")}
                onChange={(e) => onDataChange(e)}
                populators={{
                    name: "roles",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    options: [],
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="dropdown"
                infoMessage="this is form field"
                value={stateData.form}
            />) : null,
            <StageActions label={t("ADD_COMMENTS")} type="switch" />,
            <StageActions label={t("ASSIGN_TO_USER")} type="switch" />,
            <StageActions label={t("ASK_FOR_DOCUMENTS")} type="switch" />,
            <StageActions label={t("ASK_FOR_CHECKLIST")} type="dropdown" options={checklistData} />,
            <StageActions label={t("GENERATE_DOCUMENTS")} type="button" />,
            <StageActions label={t("SEND_NOTIFICATION")} type="button" />,
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

    const Action_Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{t("PROPERTIES")}</div>
            </div>,
        ],
        [
            <FieldV1
                error={actionData.label == "" ? t("PLEASE_ENTER_ACTION_NAME") : ""}
                label={t("ACTION_NAME")}
                onChange={onActionDataChange}
                populators={{
                    name: "label",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                required
                type="text"
                infoMessage="this is action name field"
                value={actionData.label}
            />,
            <FieldV1
                label={t("DESCRIPTION")}
                onChange={onActionDataChange}
                placeholder={t("DESCRIPTION")}
                populators={{
                    name: "desc",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="text"
                value={actionData.desc}
                infoMessage="this is desc field"
            />,
            <FieldV1
                label={t("ROLES")}
                onChange={(e) => onActionDataChange(e)}
                populators={{
                    name: "aroles",
                    isSearchable: true,
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    isSearchable: true,
                    options: isLoading ? [] : data.map(({ code, name }) => ({ code, name })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage="this is roles field"
                value={actionData.aroles}
            />,
            <Button
                variation="primary"
                label={t("UPDATE_ACTION")}
                type="button"
                size={"large"}
                style={{ width: "100%" }}
                onClick={updateActionProperties}
            />,
            <Button
                variation="secondary"
                label={t("DELETE_CONNECTION")}
                type="button"
                style={{ width: "100%" }}
                onClick={(e) => DeleteActionClick(selectedElement?.id, e)}
            />
        ]
    ]

    const onconnectionClick = (conn, e) => {
        setSelectedElement(conn);
        setActionData({ label: conn.label, desc: conn.desc, aroles: conn.aroles });
    }

    const transformWorkflowData = (statesData, connectionsData) => {
        const convertSlaToMs = (slaHours) => {
            return slaHours ? slaHours * 60 * 60 * 1000 : null;
        };

        const isStartState = (stateId, connections) => {
            const hasIncomingConnections = connections.some(conn => conn.to === stateId);
            const stateData = statesData.find(s => s.id === stateId);
            return !hasIncomingConnections || stateData?.nodetype === 'start';
        };

        const isTerminateState = (stateId, connections) => {
            const hasOutgoingConnections = connections.some(conn => conn.from === stateId);
            const stateData = statesData.find(s => s.id === stateId);
            return !hasOutgoingConnections || stateData?.nodetype === 'end';
        };

        const states = statesData.map(state => {
            const outgoingConnections = connectionsData.filter(conn => conn.from === state.id);
            const actions = outgoingConnections.map(conn => {
                const targetState = statesData.find(s => s.id === conn.to);
                return {
                    roles: state.roles?.map(role => role.code),
                    action: conn.label.toUpperCase().replace(/\s+/g, '_'),
                    nextState: targetState ? targetState.name.toUpperCase() : 'UNKNOWN'
                };
            });

            const isStart = isStartState(state.id, connectionsData);
            const isTerminate = isTerminateState(state.id, connectionsData);

            return {
                sla: convertSlaToMs(state.sla),
                state: isStart ? null : state.name.toUpperCase(),
                actions: actions,
                isStartState: isStart,
                isTerminateState: isTerminate,
            };
        });


        const workflow = {
            ACTIVE: "",
            states: states,
            INACTIVE: "",
            business: 'business',
            businessService: 'business_service',
        };

        return { workflow };
    }

    const getWrorkflowData = () => {
        console.log(JSON.stringify(transformWorkflowData(canvasElements, connections), null, 2));
    };

    useEffect(() => {
        const foundStart = canvasElements.some(
            (el) => el.nodetype === "start"
        );
        setHasStart(foundStart);
    }, [canvasElements]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!connectionStart) return;

            const rect = document.querySelector(".viewport")?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            setConnecting({
                from: connectionStart,
                x2: mouseX,
                y2: mouseY
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [connectionStart]);

    if (isLoading || moduleListLoading) {
        return <Loader />;
    }
    return (
        <Card style={{ flex: 1, marginRight: "1rem", border: '0.063rem solid #d6d5d4', height: "700px" }} className="Workflow-card">
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
                connections={connections}
                connecting={connecting}
                canvasPoints={CanvasClick}
                onConnectionLabelClick={(conn, e) => onconnectionClick(conn, e)}
            />
            <Card className="properties-panel Workflow-card">
                <SidePanel
                    type="static"
                    position="left"
                    isDraggable={true}
                    sections={selectedElement?.type === "node" ? Node_Properties_Section : selectedElement?.type === "action" ? Action_Properties_Section : Properties_Section}
                    defaultOpenWidth={400}
                    addClose={true}
                    isOverlay={false}
                    hideScrollIcon={true}
                    hideArrow={false}
                    className="slider-container"
                />
            </Card>
            {showToast && (
                <Toast
                    error={showToast.key}
                    label={t(showToast.label)}
                    onClose={() => {
                        setShowToast(null);
                    }}
                />
            )}
        </Card>
    );
};

export default Workflow;