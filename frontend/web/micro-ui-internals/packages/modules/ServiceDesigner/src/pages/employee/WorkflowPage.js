import React, { useState, useEffect, useRef } from "react";
import { SidePanel, PopUp, TextInput, Dropdown, FieldV1 } from "@egovernments/digit-ui-components";
import { Card } from "@egovernments/digit-ui-react-components";
import InfiniteCanvas from "../../components/Canvas";
import { useTranslation } from "react-i18next";
import WorkflowNode from "../../components/WorkflowNode";
import { Button } from "@egovernments/digit-ui-components";
import { Toast } from "@egovernments/digit-ui-components";
import StateComp from "../../components/StateComponent";
import { Loader } from "@egovernments/digit-ui-react-components";
import QuickStart from "../../components/QuickStart";
import StageActions from "../../components/StageActions";

const Workflow = () => {
    const { t } = useTranslation();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const searchParams = new URLSearchParams(location.search);
    const roleModule = searchParams.get("module") || "Studio";
    const roleService = searchParams.get("service") || "Service";
    const module = `${roleModule.toUpperCase()}${roleService.toUpperCase()}`;
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState(JSON.parse(localStorage.getItem("canvasElements")) || []);
    const [coords, setCoords] = useState([{ x: 100, y: 300 }]);
    const [showToast, setShowToast] = useState(null);
    const [hasStart, setHasStart] = useState(false);
    const [hasEnd, setHasEnd] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);
    const [connections, setConnections] = useState(JSON.parse(localStorage.getItem("connections")) || []);
    const [connecting, setConnecting] = useState(null);
    
    // New state for service configuration popup
    const [showServiceConfigPopup, setShowServiceConfigPopup] = useState(false);
    const [serviceConfigData, setServiceConfigData] = useState(null);

    const requestSearchCriteria = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "studio.roles"
            },
        },
    };
    const { isLoading, data: roles } = Digit.Hooks.useCustomAPIHook(requestSearchCriteria);
    const data= roles?.mdms;

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

    const requestCriteriaForm = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "Studio.Forms"
            },
        },
    };
    const { isLoading: FormsLoading, data: FormData } = Digit.Hooks.useCustomAPIHook(requestCriteriaForm);
    const formOptions = FormData?.mdms?.map((item) => ({
        code: item.data.formName,
        name: item.data.formName,
    }));

    const [stateData, setStateData] = useState({
        name: "",
        desc: "",
        roles: [],
        sla: 0,
        form: [],
        checklist: [],
    });

    const [actionData, setActionData] = useState({
        label: "",
        desc: "",
        aroles: [],
        aaskfordoc: false,
        aassign: false,
        aaskfordoc: false
    });

    setTimeout(() => {
        setShowToast(null);
    }, 20000);

    const onLeftClick = (elementId, e) => {
        if (connectionStart) {
            setConnections((prev) => {
                const exists = prev.some(
                    (conn) => conn.from === connectionStart && conn.to === elementId
                );
                if (exists) {
                    setShowToast({ key: true, type: "error", label: t("CONNECTION_ALREADY_EXISTS")});
                    return prev;
                }
                return [
                    ...prev,
                    { id: Date.now(), from: connectionStart, to: elementId, label: "Action", type: "action", desc: "" }
                ];
            });
            setConnectionStart(null);
        }
        else{
            setShowToast({ key: true, type:"error", label: t("START_CONNECTION_FROM_OUTPUT_HANDLE") });
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
        setConnections((prev) =>
            prev.filter((conn) => conn.to !== elementId)
        );
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
            setActionData({ label: "", desc: "", aroles: [], aaskfordoc: false, aassign: false, acomments: false });
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
        if (element.nodetype === "start") {
            return (
                <WorkflowNode
                    type={element.type}
                    elementId={element.id}
                    State={element.name}
                    desc={element.desc}
                    roles={element.roles}
                    sla={element.sla}
                    form={element.form}
                    checklist={element.checklist}
                    generatedoc={element.generatedoc}
                    sendnotif={element.sendnotif}
                    nodetype={element.nodetype}
                    onLeftAction={false}
                    onRightAction={onRightClick}
                    onDeleteAction={DeleteClick}
                    onEditAction={EditClick}
                />
            );
        } else {
            return (
                <WorkflowNode
                    type={element.type}
                    elementId={element.id}
                    State={element.name}
                    desc={element.desc}
                    roles={element.roles}
                    sla={element.sla}
                    checklist={element.checklist}
                    generatedoc={element.generatedoc}
                    sendnotif={element.sendnotif}
                    nodetype={element.nodetype}
                    onLeftAction={onLeftClick}
                    onRightAction={element.nodetype=="end"? false: onRightClick}
                    onDeleteAction={DeleteClick}
                    onEditAction={EditClick}
                />
            );
        }
    };

    const CanvasClick = (x, y) => {
        if (connectionStart) {
            const elementId = AddState("intermediate", x, y - 90);
            if (connectionStart && connectionStart !== elementId) {
                setConnections((prev) => [
                    ...prev,
                    { id: Date.now(), from: connectionStart, to: elementId, label: t("ACTION") , type: "action", desc: "" }
                ]);
                setConnectionStart(null);
            }
            setConnecting(null);
        }
    }

    const AddState = (state, x, y) => {

        const currentX = x || coords[0].x;
        const currentY = y || coords[0].y;

        let type, nodetype, name, desc, form;

        if (state === "start") {
            type = "node";
            nodetype = "start";
            name = t("START");
            desc = t("INITIAL_STATE");
            form = "";
        } else if (state === "end") {
            type = "node";
            nodetype = "end";
            name = t("END");
            desc = t("FINAL_STATE");
            form = null;
        } else {
            type = "node";
            nodetype = "intermediate";
            name = t("PROCESSING");
            desc = t("INTERMEDIATE_STATE");
            form = null;
        }

        const elementId = Date.now();

        const newElement = {
            id: elementId,
            type: type,
            name: name,
            desc: desc,
            roles: [],
            sla: 24,
            form: form, 
            checklist: [],
            generatedoc:[],
            sendnotif:[],
            nodetype: nodetype,
            position: { x: currentX, y: currentY }
        };

        setCanvasElements(prev => [...prev, newElement]);
        x === undefined && setCoords([{ x: coords[0].x + 265, y: coords[0].y }]);
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
        } else if (Array.isArray(e)) {
            setStateData(prev => ({
                ...prev,
                [e[0]]: e[1]
            }));
        }
        else if (e?.target) {
            const { name, value } = e.target;
            setStateData(prev => ({
                ...prev,
                [name]: value
            }));
        } else if (e?.code) {
            setStateData(prev => ({
                ...prev,
                form: e
            }));
        }
        else {
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
        } else if (Array.isArray(e)) {
            setActionData(prev => ({
                ...prev,
                [e[0]]: e[1]
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
        setStateData({ name: element.name, desc: element.desc, roles: element.roles, sla: element.sla, form: element.form || [], checklist: element.checklist });
    }

    const handleElementDrag = (element, newPosition) => {
        setCanvasElements(prev =>
            prev.map(el => el.id === element.id ? { ...el, position: newPosition } : el)
        );
    };

    const updateProperties = () => {
        if (stateData.name === "" || stateData.sla < 1) {
            setShowToast({ key: true, type:"error", label: t("FILL_THE_REQUIRED_DETAILS") });
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
                            form: stateData?.form,
                            checklist: stateData?.checklist,
                        };
                        setSelectedElement(updatedElement);
                        return updatedElement;
                    }
                    return element;
                })
            );
        }

    }

    const updateActionProperties = () => {
        if (actionData.label === "") {
            setShowToast({ key: true, type:"error", label: t("FILL_THE_REQUIRED_DETAILS") });
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
                            aaskfordoc: actionData.aaskfordoc,
                            aassign: actionData.aassign,
                            acomments: actionData.acomments,
                        };
                        setSelectedElement(updatedElement);
                        return updatedElement;
                    }
                    return element;
                })
            );
        }
    }

    const elementsWithComponents = canvasElements.map(element => ({
        ...element,
        component: createWorkflowNode(element)
    }));

    const Workflow_Sections = [
        [
            <div>
                <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                    <div >{t("WORKFLOW_STATES")}</div>
                </div>
                <div className="typography heading-sl" style={{ color: "#0B4B66", marginLeft: "16px" }}>
                    <div >{t("WORKFLOW_STATES_DESC")}</div>
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
                disabled={hasEnd}
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
                className="secondary-button"
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
                infoMessage={t("STATE_INFO")}
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
                infoMessage={t("DESC_INFO")}
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
                    options: isLoading ? [] : data?.map(({ data }) => ({ code: data.code, name: data.id })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("ROLES_INFO")}
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
                infoMessage={t("SLA_INFO")}
                value={stateData.sla}
            />,
            selectedElement?.nodetype == "start" ? (<FieldV1
                label={t("SERVICE_REQUEST_FORM")}
                onChange={(e) => onDataChange(e)}
                populators={{
                    name: "form",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    options: FormsLoading ? [] : [...formOptions],
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="dropdown"
                infoMessage={t("FORM_INFO")}
                value={stateData.form}
            />) : null,
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                    <div >{t("STAGE_ACTIONS")}</div>
            </div>,
            <StageActions label={t("ASK_FOR_CHECKLIST")} type="dropdown" name="checklist" options={checklistData} desc={t("CHECLIST_DESC")} onClick={(e) => onDataChange(e)} value={stateData.checklist}/>,
            <StageActions label={t("GENERATE_DOCUMENTS")} type="button" name="generatedoc" desc={t("GEN_DOC_DESC")}/>,
            <StageActions label={t("SEND_NOTIFICATION")} type="button" name="sendnotif" desc={t("NOFITICATION_DESC")}/>,
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
                className="secondary-button"
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
                infoMessage={t("ACTION_STATE_INFO")}
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
                infoMessage={t("ACTION_DESC_INFO")}
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
                    options: isLoading ? [] : data?.map(({ data }) => ({ code: data.code, name: data.id })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("ACTION_ROLES_INFO")}
                value={actionData.aroles}
            />,
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div >{t("STAGE_ACTIONS")}</div>
            </div>,
            <StageActions label={t("ADD_COMMENTS")} type="switch" name="acomments" desc={t("COMMENTS_DESC")} onClick={(data) => onActionDataChange(data)} value={actionData.acomments} />,
            <StageActions label={t("ASSIGN_TO_USER")} type="switch" name="aassign" desc={t("ASSIGN_DESC")} onClick={(e) => onActionDataChange(e)} value={actionData.aassign} />,
            <StageActions label={t("ASK_FOR_DOCUMENTS")} type="switch" name="aaskfordoc" desc={t("DOC_DESC")} onClick={(e) => onActionDataChange(e)} value={actionData.aaskfordoc} />,
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
                className="secondary-button"
                style={{ width: "100%" }}
                onClick={(e) => DeleteActionClick(selectedElement?.id, e)}
            />
        ]
    ]

    const onconnectionClick = (conn, e) => {
        setSelectedElement(conn);
        setActionData({ label: conn.label, desc: conn.desc, aroles: conn.aroles, aaskfordoc: conn.aaskfordoc, aassign: conn.aassign, acomments: conn.acomments });
    }

    function documentConfig(connections, module) {
        const actions = connections.map(connection => {
            const actionName = connection.label;

            const showAssignee = connection.aassign || false;

            const showComments = connection.acomments || false;

            let documents = [];

            return {
                "action": actionName,
                "assignee": {
                    "show": showAssignee,
                    "isMandatory": false
                },
                "comments": {
                    "show": showComments,
                    "isMandatory": false
                },
                "documents": documents
            };
        });

        return [{
            "module": module,
            "actions": actions,
            "bannerLabel": "OBPS_BANNER",
            "maxSizeInMB": 5,
            "allowedFileTypes": [
                "pdf",
                "doc", 
                "docx", 
                "xlsx", 
                "xls", 
                "jpeg", 
                "jpg", 
                "png"
            ]
        }]
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
                    roles: conn.aroles?.map(role => role.code),
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
                isStateUpdatable: true,
                isTerminateState: isTerminate,
                applicationStatus: null,
                docUploadRequired: false
            };
        });


        const workflow = {
            ACTIVE: [],
            states: states,
            INACTIVE: [],
            business: 'business',
            businessService: 'business_service',
            generateDemandAt: [],
            businessServiceSla: 5184000000,
            nextActionAfterPayment: "",
            autoTransitionEnabledStates: []
        };

        return { workflow };
    }

    // Function to get form data from start state
    const getFormDataFromStartState = () => {
        const startState = canvasElements.find(state => state.nodetype === "start");
        
        if (!startState || !startState.form || startState.form.length === 0) {
            return null;
        }
        
        // Get the selected form name from start state
        const selectedFormName = startState.form?.name;
        
        if (!selectedFormName) {
            return null;
        }
        
        // Find the form data from FormData
        const selectedForm = FormData?.mdms?.find(form => form.data.formName === selectedFormName);
        
        return selectedForm?.data?.formConfig?.screens || null;
    };

    // Function to fetch roles from API
    const fetchRolesFromAPI = async () => {
        try {
            const mdms_context_path = window?.globalConfigs?.getConfig("MDMS_V2_CONTEXT_PATH") || "mdms-v2";
            const response = await Digit.CustomService.getResponse({
                url: `/${mdms_context_path}/v2/_search`,
                body: {
                    MdmsCriteria: {
                        tenantId: Digit.ULBService.getCurrentTenantId(),
                        schemaCode: "studio.roles",
                        isActive: true
                    }
                }
            });
            
            if (response && response.mdms && response.mdms.length > 0) {
                return response.mdms.map(role => ({
                    code: role.data.code,
                    name: role.data.description || role.data.code,
                    access: role.data.additionalDetails?.access || {}
                }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching roles:", error);
            return [];
        }
    };

    // Function to transform form configuration to fields format
    const transformFormToFields = (formConfig) => {
        
        if (!formConfig) {
            return [];
        }
        
        const fields = [];
        
        formConfig.forEach((screen, screenIndex) => {
            screen.cards?.forEach((card, cardIndex) => {
                
                // Get section heading from headerFields
                const headerField = card.headerFields?.find(hf => hf.label === "SCREEN_HEADING");
                const sectionName = headerField?.value || card.header || `Section ${cardIndex + 1}`;
                
                
                // Skip pre-defined sections (ADDRESS DETAILS, APPLICANT DETAILS)
                if (sectionName.toUpperCase().includes("ADDRESS DETAILS") || 
                    sectionName.toUpperCase().includes("APPLICANT DETAILS")) {
                    return;
                }
                
                // Create properties array for this card
                const properties = [];
                
                card.fields?.forEach((field, fieldIndex) => {
                    
                    // Skip fields without proper configuration
                    if (!field || !field.type) {
                        return;
                    }
                    
                    const fieldConfig = {
                        name: field.label.replaceAll(" ","") || `field_${screenIndex}_${cardIndex}_${fieldIndex}`,
                        type: field.type === "textInput" ? "string" : 
                              field.type === "datePicker" ? "date" : 
                              field.type === "dropdown" ? "string" : 
                              field.type === "text" ? "string" :
                              field.type === "number" ? "integer" : 
                              field.type === "mobileNumber" ? "string" : "string",
                        label: field.label || `Field ${fieldIndex + 1}`,
                        format: field.type === "textInput" ? "text" : 
                                field.type === "datePicker" ? "date" : 
                                field.type === "dropdown" ? "radioordropdown" : 
                                field.type === "text" ? "text" :
                                field.type === "number" ? "text" : 
                                field.type === "mobileNumber" ? "mobileNumber" : "text",
                        required: field.required || false,
                        orderNumber: fieldIndex + 1,
                        maxLength: field.maxLength || 128,
                        minLength: field.minLength || 2,
                        validation: field.validation || {},
                        defaultValue: field.defaultValue || field.value || "",
                        helpText: field.helpText || "",
                        tooltip: field.tooltip || "",
                        errorMessage: field.errorMessage || ""
                    };
                    
                    // Handle dropdown options
                    if (field.dropDownOptions && field.dropDownOptions.length > 0) {
                        fieldConfig.values = field.dropDownOptions.map(option => option.name || option.code);
                        fieldConfig.schema = `${roleModule.toUpperCase()}.${field.label?.replace(/\s+/g, '')}`;
                        fieldConfig.reference = "mdms";
                    }
                    
                    // Handle boundary data (city dropdown)
                    if (field.isBoundaryData) {
                        fieldConfig.values = [];
                        fieldConfig.schema = `${roleModule.toUpperCase()}.${field.label?.replace(/\s+/g, '')}`;
                        fieldConfig.reference = "mdms";
                    }
                    
                    // Handle mobile number specific properties
                    if (field.type === "mobileNumber") {
                        fieldConfig.isdCodePrefix = field.isdCodePrefix || "+91";
                    }
                    
                    properties.push(fieldConfig);
                });
                
                // Create card object with properties
                if (properties.length > 0) {
                    const cardObject = {
                        name: sectionName.replace(/\s+/g, ''),
                        type: "object",
                        label: sectionName,
                        properties: properties
                    };
                    
                    fields.push(cardObject);
                }
            });
        });
        
        return fields;
    };

    // Function to collect all roles from workflow
    const collectAllRoles = async () => {
        const usedRoleCodes = new Set();
        
        // Add default roles
        usedRoleCodes.add("CITIZEN");
        usedRoleCodes.add("STUDIO_ADMIN");
        
        // Collect role codes from states
        canvasElements.forEach(state => {
            if (state.roles && Array.isArray(state.roles)) {
                state.roles.forEach(role => {
                    if (role.code) usedRoleCodes.add(role.code);
                });
            }
        });
        
        // Collect role codes from connections/actions
        connections.forEach(connection => {
            if (connection.aroles && Array.isArray(connection.aroles)) {
                connection.aroles.forEach(role => {
                    if (role.code) usedRoleCodes.add(role.code);
                });
            }
        });
        
        
        // Fetch roles from API and filter only used ones
        try {
            const apiRoles = await fetchRolesFromAPI();
            const usedRoles = apiRoles.filter(role => usedRoleCodes.has(role.code));
            
            // Create access mapping based on role permissions
            const accessMapping = {
                editor: [],
                viewer: [],
                creator: []
            };
            
            usedRoles.forEach(role => {
                const access = role.access || {};
                
                if (access.editor) {
                    accessMapping.editor.push(role.code);
                }
                if (access.viewer) {
                    accessMapping.viewer.push(role.code);
                }
                if (access.creater) { // Note: API has "creater" not "creator"
                    accessMapping.creator.push(role.code);
                }
            });
            
            // Add default roles to appropriate access levels
            accessMapping.editor.push("CITIZEN", "STUDIO_ADMIN");
            accessMapping.viewer.push("CITIZEN", "STUDIO_ADMIN");
            accessMapping.creator.push("CITIZEN", "STUDIO_ADMIN");
            
            return accessMapping;
            
        } catch (error) {
            console.error("Error fetching roles from API:", error);
            
            // Fallback: return all used roles for all access levels
            const allUsedRoles = Array.from(usedRoleCodes);
            return {
                editor: allUsedRoles,
                viewer: allUsedRoles,
                creator: allUsedRoles
            };
        }
    };

    // Function to check if specific sections exist in form
    const checkFormSections = (formConfig) => {
        if (!formConfig) return { hasAddressDetails: false, hasApplicantDetails: false };
        
        let hasAddressDetails = false;
        let hasApplicantDetails = false;
        
        formConfig.forEach(screen => {
            screen.cards?.forEach(card => {
                const headerField = card.headerFields?.find(hf => hf.label === "SCREEN_HEADING");
                const sectionName = headerField?.value || card.header || "";
                
                if (sectionName.toUpperCase().includes("ADDRESS DETAILS")) {
                    hasAddressDetails = true;
                }
                if (sectionName.toUpperCase().includes("APPLICANT DETAILS")) {
                    hasApplicantDetails = true;
                }
            });
        });
        
        return { hasAddressDetails, hasApplicantDetails };
    };

    // Function to generate complete service configuration
    const generateServiceConfiguration = async () => {
        // Get existing console outputs
        const workflowData = transformWorkflowData(canvasElements, connections);
        const documentData = documentConfig(connections, module);
        
        // Get form data from start state
        const formDataFromStartState = getFormDataFromStartState();
        const formFields = transformFormToFields(formDataFromStartState);
        
        // Check for specific sections in form
        const { hasAddressDetails, hasApplicantDetails } = checkFormSections(formDataFromStartState);
        
        // Transform roles to the format expected in service config
        const accessMapping = await collectAllRoles();
        
        // Get module and service from URL parameters
        const moduleName = roleModule.toLowerCase();
        const serviceName = roleService.toLowerCase();
        
        const serviceConfig = {
            module: moduleName,
            service: serviceName,
            enabled: ["citizen", "employee"],
            workflow: workflowData.workflow,
            documents: documentData,
            fields: formFields,
            access: {
                roles: accessMapping,
                actions: [
                    {
                        url: `${serviceName}-services/v1/create`
                    }
                ]
            },
            rules: {
                validation: {
                    type: "schema",
                    service: serviceName,
                    schemaCode: `${serviceName}.apply`,
                    customFunction: ""
                },
                calculator: {
                    type: "custom",
                    service: serviceName,
                    customFunction: ""
                },
                registry: {
                    type: "api",
                    service: serviceName
                },
                references: [
                    {
                        type: "initiate",
                        service: serviceName
                    }
                ]
            },
            calculator: {
                type: "custom",
                billingSlabs: [
                    {
                        key: "applicationFee",
                        value: 2000
                    }
                ]
            },
            idgen: [
                {
                    type: "application",
                    format: `${serviceName}.application.number`,
                    idname: `${serviceName}-service.application.${serviceName}.applicationapp.id`
                }
            ],
            localization: {
                modules: [`digit-${serviceName}`]
            },
            notification: {
                sms: [
                    {
                        code: `DIGIT_STUDIO_${moduleName.toUpperCase()}_${serviceName.toUpperCase()}_APPLICATION`,
                        states: ["SIGNED"],
                        template: `Dear {PublicService.applicants[0].name} a ${serviceName.toUpperCase()} Application with application no {PublicService.applicationNo} is received`
                    }
                ],
                email: [
                    {
                        code: `DIGITEMAIL_STUDIO_${moduleName.toUpperCase()}_${serviceName.toUpperCase()}_APPLICATION`,
                        states: ["SIGNED"],
                        template: `Dear {PublicService.applicants[0].name} a ${serviceName.toUpperCase()} Application with application no {PublicService.applicationNo} is received`
                    }
                ]
            },
            boundary: hasAddressDetails ? {
                lowestLevel: "locality",
                hierarchyType: "REVENUE"
            } : {},
            applicant: hasApplicantDetails ? {
                types: ["individual", "organisation"],
                config: {
                    systemUser: true,
                    systemRoles: ["CITIZEN"],
                    systemUserType: "CITIZEN"
                },
                maximum: 3,
                minimum: 1
            } : {},
            apiconfig: [
                {
                    host: "https://staging.digit.org",
                    type: "register",
                    method: "post",
                    service: serviceName,
                    endpoint: `/${serviceName}-services/v1/create`
                },
                {
                    host: "https://staging.digit.org",
                    type: "search",
                    method: "post",
                    service: serviceName,
                    endpoint: `/${serviceName}-services/v1/search`
                }
            ]
        };
        
        return serviceConfig;
    };

    const getWrorkflowData = async () => {
        // Log the existing console outputs as before
        
        // Generate service configuration automatically
        const serviceConfig = await generateServiceConfiguration();
        setServiceConfigData(serviceConfig);
        
        // Show the popup with the generated configuration
        setShowServiceConfigPopup(true);
    };



    const onClear =() =>{
        setCanvasElements([]);
        setConnections([]);
        setSelectedElement(null);
        setConnectionStart(null);
        setConnecting(null);
    }

    useEffect(() => {
        const foundStart = canvasElements.some(
            (el) => el.nodetype === "start"
        );
        setHasStart(foundStart);
        const foundEnd = canvasElements.some(
            (el) => el.nodetype === "end"
        );
        setHasEnd(foundEnd);
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

    useEffect(()=>{
        localStorage.setItem("connections", JSON.stringify(connections));
        localStorage.setItem("canvasElements", JSON.stringify(canvasElements));
    },[connections,canvasElements]);

    if (isLoading || moduleListLoading) {
        return <Loader />;
    }
    return (
        <Card style={{ flex: 1, marginRight: "1rem", border: '0.063rem solid #d6d5d4' }} className="Workflow-card">
            <Card className="Workflow-card">
                <SidePanel
                    type="static"
                    position="left"
                    isDraggable={true}
                    sections={Workflow_Sections}
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
                onClear={onClear}
            />
            { selectedElement && <Card className="Workflow-card">
                <SidePanel
                    type="static"
                    position="left"
                    isDraggable={true}
                    sections={selectedElement?.type === "node" ? Node_Properties_Section : selectedElement?.type === "action" ? Action_Properties_Section : Properties_Section}
                    addClose={true}
                    isOverlay={false}
                    hideScrollIcon={true}
                    hideArrow={false}
                    className="slider-container"
                />
            </Card>}
            {showToast && (
                <Toast
                    type={showToast?.type}
                    label={t(showToast?.label)}
                    onClose={() => {
                        setShowToast(null);
                    }}
                    isDleteBtn={showToast?.isDleteBtn}
                />
            )}
            
            {/* Service Configuration Popup */}
            {showServiceConfigPopup && (
                <PopUp
                    header={t("SERVICE_CONFIGURATION")}
                    headerBarMain={t("GENERATED_SERVICE_CONFIG")}
                    actionCancelLabel={t("CLOSE")}
                    actionCancelOnSubmit={() => setShowServiceConfigPopup(false)}
                    actionSaveLabel={t("COPY_CONFIG")}
                    actionSaveOnSubmit={() => {
                        navigator.clipboard.writeText(JSON.stringify(serviceConfigData, null, 2));
                        setShowToast({
                            type: "success",
                            label: "CONFIGURATION_COPIED_TO_CLIPBOARD"
                        });
                    }}
                    onClose={() => setShowServiceConfigPopup(false)}
                    children={[
                        <div key="service-config-preview" style={{ 
                            background: "#f8f9fa", 
                            padding: "1rem", 
                            borderRadius: "8px", 
                            maxHeight: "70vh", 
                            overflow: "auto",
                            border: "1px solid #e9ecef"
                        }}>
                            <h4 style={{ marginBottom: "1rem", color: "#495057" }}>{t("COMPLETE_SERVICE_CONFIGURATION")}</h4>
                            <pre style={{ 
                                fontSize: "12px", 
                                lineHeight: "1.4", 
                                color: "#495057",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                            }}>
                                {JSON.stringify(serviceConfigData, null, 2)}
                            </pre>
                        </div>
                    ]}
                />
            )}
        </Card>
    );
};

export default Workflow;