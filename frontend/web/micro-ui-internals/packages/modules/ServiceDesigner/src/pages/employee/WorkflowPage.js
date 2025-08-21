import React, { useState, useEffect, useRef } from "react";
import { SidePanel, PopUp, TextInput, Dropdown, FieldV1, TextArea } from "@egovernments/digit-ui-components";
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
import { useServiceConfigAPI } from "../../hooks/useServiceConfigAPI";
import { useChecklistConfigAPI } from "../../hooks/useChecklistConfigAPI";
import { useRoleConfigAPI } from "../../hooks/useRoleConfigAPI";
import generateMdmsRolePayload from "../../config/rolecreateConfig";
import AccessCard from "../../components/AccessCard";
import { useHistory } from "react-router-dom";
import { useNotificationConfigAPI } from "../../hooks/useNotificationConfigAPI";

const Workflow = () => {
    const { t } = useTranslation();
    const history = useHistory();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const searchParams = new URLSearchParams(location.search);
    const roleModule = searchParams.get("module") || "Studio";
    const roleService = searchParams.get("service") || "Service";
    const servicemodule = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState((localStorage.getItem("canvasElements") !== "undefined" ? JSON.parse(localStorage.getItem("canvasElements")) : []) || []);
    const [coords, setCoords] = useState([{ x: 100, y: 300 }]);
    const [showToast, setShowToast] = useState(null);
    const [hasStart, setHasStart] = useState(false);
    const [hasEnd, setHasEnd] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);
    const [connections, setConnections] = useState((localStorage.getItem("connections") !== "undefined" ? JSON.parse(localStorage.getItem("connections")) : []) || []);
    const [connecting, setConnecting] = useState(null);
    
    // New state for service configuration popup
    const [showServiceConfigPopup, setShowServiceConfigPopup] = useState(false);
    const [serviceConfigData, setServiceConfigData] = useState(null);
    const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
    const [editableServiceConfig, setEditableServiceConfig] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [existingServiceConfigId, setExistingServiceConfigId] = useState(null);
    const [rolePopup, setRolePopup]=useState(false);
    const [loadSamplePopup,setLoadSamplePopup]=useState(false);
    
    // Service creation mutation hook
    //changes for publish
    const serviceCreationMutation = Digit.Hooks.useCustomAPIMutationHook({
        url: "/public-service/v1/service",
        method: "POST",
        headers: {
            "X-Tenant-Id": tenantId
        },
        config: { enable: false }
    });
    const MDMS_CONTEXT_PATH = window?.globalConfigs?.getConfig("MDMS_CONTEXT_PATH") || "egov-mdms-service";
    
    // Check if we're in edit mode
    const isEditMode = searchParams.get("edit") === "true";
    
    // Service configuration API hooks
    const { saveServiceConfig, updateServiceConfig, fetchServiceConfig } = useServiceConfigAPI();
    const { data: existingServiceConfig } = fetchServiceConfig(roleModule, roleService);

    // Use the new role config API hook
    const { searchRoleConfigs, saveRoleConfig } = useRoleConfigAPI();
    const { data: roleConfigs, isLoading } = searchRoleConfigs(roleModule, roleService);
    const data = roleConfigs || [];

    // Use the new checklist config API hook
    const { searchChecklistConfigs } = useChecklistConfigAPI();
    const { data: checklistConfigs, isLoading: moduleListLoading } = searchChecklistConfigs(roleModule, roleService);
    const checklistData = checklistConfigs?.map((item) => ({
        code: item.data.name,
        name: item.data.name,
    })) || [];

    const requestCriteriaForm = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "Studio.ServiceConfigurationDrafts",
                filters: {
                    module: roleModule,
                    service: roleService,
                },
            },
        },
    };
    const { isLoading: FormsLoading, data: FormData } = Digit.Hooks.useCustomAPIHook(requestCriteriaForm);
    const draft = FormData?.mdms?.[0];
    const formOptions = draft?.data?.uiforms?.map((form) => ({
        code: form.formName,
        name: form.formName,
    })) || [];

    // Use the new notification config API hook
    const { searchNotificationConfigs } = useNotificationConfigAPI();
    const { data: notificationConfigs, isLoading: isConfigLoad } = searchNotificationConfigs(roleModule, roleService);
    const notif = notificationConfigs?.filter(item => item.additionalDetails?.category === servicemodule) || [];

    const [stateData, setStateData] = useState({
        name: "",
        desc: "",
        roles: [],
        sla: 0,
        form: [],
        checklist: [],
        sendnotif:[],
        generatedoc:[],
    });

    const [actionData, setActionData] = useState({
        label: "",
        desc: "",
        aroles: [],
        aaskfordoc: false,
        aassign: false,
        aaskfordoc: false
    });

    const [roleData, setRoleData] = useState({
        name: "",
        desc: "",
        viewer: false,
        editor: false,
        creater: false,
    });

    setTimeout(() => {
        setShowToast(null);
    }, 20000);

    // Handle edit mode initialization
    useEffect(() => {
        if (isEditMode && existingServiceConfig) {
            setExistingServiceConfigId(existingServiceConfig.id);
            
            // Load the workflow data from existing service config
            if (existingServiceConfig.data) {
                const configData = existingServiceConfig.data;
                
                // Load canvas elements and connections from uiworkflow
                if (configData.uiworkflow && configData.uiworkflow.canvasElements) {
                    setCanvasElements(configData.uiworkflow.canvasElements);
                    localStorage.setItem("canvasElements", JSON.stringify(configData.uiworkflow.canvasElements));
                }
                
                if (configData.uiworkflow && configData.uiworkflow.connections) {
                    setConnections(configData.uiworkflow.connections);
                    localStorage.setItem("connections", JSON.stringify(configData.uiworkflow.connections));
                }
                
                // Fallback to workflow if uiworkflow doesn't exist (for backward compatibility)
                if (!configData.uiworkflow) {
                    if (configData.workflow && configData.workflow.canvasElements) {
                        setCanvasElements(configData.workflow.canvasElements);
                        localStorage.setItem("canvasElements", JSON.stringify(configData.workflow.canvasElements));
                    }
                    
                    if (configData.workflow && configData.workflow.connections) {
                        setConnections(configData.workflow.connections);
                        localStorage.setItem("connections", JSON.stringify(configData.workflow.connections));
                    }
                }
            }
        }
    }, [isEditMode, existingServiceConfig]);

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
                    { id: Date.now(), from: connectionStart, to: elementId, label: t("ACTION"), type: "action", desc: "" }
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
        e?.stopPropagation?.();
    
        if (connectionStart === elementId) {
            // Already drawing from this node → stop arrow mode
            setConnectionStart(null);
            setConnecting(null);
        } else {
            // Start drawing arrow from this node
            setConnectionStart(elementId);
            setConnecting(true);
        }
    };

    const DeleteClick = (elementId, e) => {
        setCanvasElements(prev => {
            return prev.filter(element => element.id !== elementId);
        });
        setConnections((prev) =>
            prev.filter((conn) => conn.to !== elementId && conn.from !== elementId)
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

    const onRoleChange = (e) => {
        if (Array.isArray(e)) {
            setRoleData(prev => ({
                ...prev,
                [e[0]]: e[1].target.checked
            }));
        }
        else if (e?.target) {
            const { name, value } = e.target;
            setRoleData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const generateRolePayload = (roleName, description, access) => {
        return {
            module: roleModule,
            service: roleService,
            roleName: roleName,
            description: description,
            access: access
        };
    };

     const createRole = async (e) => {
        if (roleData.name != "" && (roleData.creater || roleData.editor || roleData.viewer)) {
                const access = {
                    editor: roleData.editor,
                    viewer: roleData.viewer,
                    creater: roleData.creater
                };

                if (data?.some(role => role?.data?.code?.toUpperCase() === roleData.name.toUpperCase())) {
                    setShowToast({ key: true, type: "error", label: t("ROLE_NAME_EXISTS") });
                }
                else {
                    try {
                        const rolePayload = generateRolePayload(roleData.name, roleData.desc, access);
                        const response = await saveRoleConfig.mutateAsync(rolePayload);
                        
                        if (response?.mdms) {
                            setShowToast({ key: true, type: "success", label: t("ROLE_ADDED_SUCCESSFULLY") });
                            setRoleData({
                                name: "",
                                desc: "",
                                viewer: false,
                                editor: false,
                                creater: false,
                            });
                            setRolePopup(false);
                            window.location.reload();
                        }
                        else {
                            setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_CREATION") });
                            setRoleData({
                                name: "",
                                desc: "",
                                viewer: false,
                                editor: false,
                                creater: false,
                            });
                            setRolePopup(false);
                        }
                    } catch (error) {
                        setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_CREATION") });
                        setRoleData({
                            name: "",
                            desc: "",
                            viewer: false,
                            editor: false,
                            creater: false,
                        });
                        setRolePopup(false);
                    }
                }
        }
        else {
            if (roleData.name == "") {
                setShowToast({ key: true, type: "error", label: t("ROLE_NAME_IS_REQUIRED") });
            }
            else {
                setShowToast({ key: true, type: "error", label: t("ATLEAST_ONE_IS_SELECTED") });
            }
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

    // Smart positioning function to avoid overlapping elements
    const findSmartPosition = (proposedX, proposedY, existingElements) => {
        const elementWidth = 250; // Approximate width of canvas elements
        const elementHeight = 120; // Approximate height of canvas elements
        const padding = 50; // Minimum distance between elements
        const viewportWidth = 1200; // Approximate viewport width
        const viewportHeight = 800; // Approximate viewport height
        
        // If no existing elements, use the proposed position
        if (existingElements.length === 0) {
            return { x: proposedX, y: proposedY };
        }
        
        // Check if proposed position overlaps with any existing element
        const isOverlapping = (x, y) => {
            return existingElements.some(element => {
                const elementX = element.position.x;
                const elementY = element.position.y;
                
                // Check if rectangles overlap
                return !(x + elementWidth + padding < elementX || 
                        elementX + elementWidth + padding < x ||
                        y + elementHeight + padding < elementY || 
                        elementY + elementHeight + padding < y);
            });
        };
        
        // If proposed position doesn't overlap, use it
        if (!isOverlapping(proposedX, proposedY)) {
            return { x: proposedX, y: proposedY };
        }
        
        // Try to find a position in a grid pattern around the proposed position
        const gridSpacing = elementWidth + padding;
        const maxAttempts = 20; // Limit search attempts
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // Try positions in expanding circles around the proposed position
            const radius = attempt * gridSpacing;
            
            // Try 8 directions around the proposed position
            const directions = [
                { dx: 0, dy: -radius }, // North
                { dx: radius, dy: -radius }, // Northeast
                { dx: radius, dy: 0 }, // East
                { dx: radius, dy: radius }, // Southeast
                { dx: 0, dy: radius }, // South
                { dx: -radius, dy: radius }, // Southwest
                { dx: -radius, dy: 0 }, // West
                { dx: -radius, dy: -radius } // Northwest
            ];
            
            for (const direction of directions) {
                const testX = proposedX + direction.dx;
                const testY = proposedY + direction.dy;
                
                // Ensure position is within viewport bounds
                if (testX >= 0 && testX <= viewportWidth - elementWidth &&
                    testY >= 0 && testY <= viewportHeight - elementHeight) {
                    
                    if (!isOverlapping(testX, testY)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }
        
        // If no position found, try to find the least crowded area
        const gridSize = 50;
        const grid = {};
        
        // Create a grid and count elements in each cell
        existingElements.forEach(element => {
            const gridX = Math.floor(element.position.x / gridSize);
            const gridY = Math.floor(element.position.y / gridSize);
            const key = `${gridX},${gridY}`;
            grid[key] = (grid[key] || 0) + 1;
        });
        
        // Find the least crowded area
        let bestX = proposedX;
        let bestY = proposedY;
        let minDensity = Infinity;
        
        for (let x = 0; x < viewportWidth; x += gridSize) {
            for (let y = 0; y < viewportHeight; y += gridSize) {
                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);
                const key = `${gridX},${gridY}`;
                const density = grid[key] || 0;
                
                if (density < minDensity && !isOverlapping(x, y)) {
                    minDensity = density;
                    bestX = x;
                    bestY = y;
                }
            }
        }
        
        return { x: bestX, y: bestY };
    };

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

        // Use smart positioning to find the best location
        const smartPosition = findSmartPosition(currentX, currentY, canvasElements);

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
            position: smartPosition
        };

        setCanvasElements(prev => [...prev, newElement]);
        
        // Update coords for next element placement
        if (x === undefined) {
            setCoords([{ x: smartPosition.x + 265, y: smartPosition.y }]);
        }
        
        return newElement.id;
    };

    const onDataChange = (e) => {
        if (Array.isArray(e) && e.length === 0) {
            return;
        }
        
        // Handle array format [fieldName, selectedValue] from StageActions
        // if (Array.isArray(e) && e.length === 2 && typeof e[0] === 'string') {
        //     const [fieldName, selectedValue] = e;
        //     console.log("Setting", fieldName, "to", selectedValue);
        //     setStateData(prev => ({
        //         ...prev,
        //         [fieldName]: selectedValue
        //     }));
        //     return;
        // }
        
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
        setStateData({ name: element.name, desc: element.desc, roles: element.roles, sla: element.sla, form: element.form || [], checklist: element.checklist, aaskfordoc: element.aaskfordoc, sendnotif: element.sendnotif  });
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
                            sendnotif: stateData?.sendnotif,
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
                        label={isGeneratingConfig ? t("GENERATING_CONFIG") : (isEditMode ? t("UPDATE_SERVICE_CONFIG") : t("GET_SERVICE_CONFIG"))}
                        type="button"
                        className="secondary-button"
                        style={{ width: "100%" }}
                        disabled={isGeneratingConfig}
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
            <div className="typography heading-m" style={{ color: "#0B4B66", marginLeft: "0px" }}>
                <div>{t("STATE_PROPERTIES")}</div>
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
                type="textarea"
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
                    options: isLoading ? [] : data?.map((role) => ({ code: role?.data?.code, name: role?.data?.description || role?.data?.code })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("ROLES_INFO")}
                value={stateData.roles}
            />,
            <span
                onClick={(e) => setRolePopup(true)}
                style={{
                    color: "#C84C0E",
                    cursor: "pointer",
                    fontWeight: "500",
                    textAlign: "right"
                }}
            >
                {t("ADD_NEW_ROLE")}
            </span>,
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
            <FieldV1
                label={t("ASK_FOR_CHECKLIST")}
                onChange={(e) => onDataChange(["checklist",e])}
                populators={{
                    name: "dropdownField",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    options: moduleListLoading ? [] : [...checklistData],
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("CHECKLIST_INFO")}
                value={stateData.checklist}
            />,
            <FieldV1
                label={t("SEND_NOTIFICATION")}
                onChange={(e) => onDataChange(["sendnotif", e])}
                populators={{
                    name: "dropdownField",
                    alignFieldPairVerically: true,
                    fieldPairClassName: "workflow-field-pair",
                    optionsKey: "code",
                    options: notif?.map((notification) => ({code: notification?.title, name: notification?.title})) || [],
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("NOTIF_INFO")}
                value={stateData.sendnotif}
            />,
            //<StageActions label={t("ASK_FOR_CHECKLIST")} type="dropdown" name="checklist" options={checklistData} desc={t("CHECLIST_DESC")} onClick={(e) => onDataChange(e)} value={stateData.checklist}/>,
            //<StageActions label={t("SEND_NOTIFICATION")} type="dropdown" name="sendnotif" options={notif?.map(({ data }) => ({code: data?.title, name: data?.title}))} desc={t("NOFITICATION_DESC")} onClick={(e) => onDataChange(e)} value={stateData.sendnotif}/>,
            <StageActions label={t("GENERATE_DOCUMENTS")} type="button" name="generatedoc" desc={t("GEN_DOC_DESC")}/>,
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
            <div className="typography heading-m" style={{ color: "#0B4B66", marginLeft: "0px" }}>
                <div>{t("ACTION_PROPERTIES")}</div>
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
                type="textarea"
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
                    options: isLoading ? [] : data?.map((role) => ({ code: role?.data?.code, name: role?.data?.description || role?.data?.code })),
                }}
                props={{
                    fieldStyle: { width: "100%" }
                }}
                type="multiselectdropdown"
                infoMessage={t("ACTION_ROLES_INFO")}
                value={actionData.aroles}
            />,
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
                "action": actionName.toUpperCase().replace(/\s+/g, '_'),
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
                const moduleServicePrefix = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
                return {
                    roles: conn.aroles ? [...conn.aroles?.map(role => `${moduleServicePrefix}_${role.code.toUpperCase().replace(/\s+/g, '_')}`), "CITIZEN", "STUDIO_ADMIN"] : ["CITIZEN", "STUDIO_ADMIN"],
                    action: conn.label.toUpperCase().replace(/\s+/g, '_'),
                    nextState: targetState ? targetState.name.toUpperCase().replace(/\s+/g, '_') : 'UNKNOWN'
                };
            });

            const isStart = isStartState(state.id, connectionsData);
            const isTerminate = isTerminateState(state.id, connectionsData);

            // Prepare additional details for forms and checklists
            const additionalDetails = {};
            if (state.form && state.form.length > 0) {
                additionalDetails.form = {
                    name: state.form.name,
                    code: state.form.code
                };
            }
            if (state.checklist && state.checklist.length > 0) {
                additionalDetails.checklist = {
                    name: state.checklist.name,
                    code: state.checklist.code
                };
            }

            return {
                sla: convertSlaToMs(state.sla),
                state: isStart ? null : state.name.toUpperCase().replace(/\s+/g, '_'),
                actions: actions,
                isStartState: isStart,
                isStateUpdatable: true,
                isTerminateState: isTerminate,
                applicationStatus: null,
                docUploadRequired: false,

                //additionalDetails: stateData
            };
        });


        const workflow = {
            ACTIVE: [],
            states: states,
            INACTIVE: [],
            business: 'business',
            businessService: `${roleModule}.${roleService}`,
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
        
        if (!startState || !startState.form) {
            return null;
        }
        
        // Get the selected form name from start state
        const selectedFormName = startState.form?.name;
        
        if (!selectedFormName) {
            return null;
        }
        
        // Find the form data from FormData
        const selectedForm = FormData?.mdms?.[0]?.data?.uiforms?.find(form => form.formName === selectedFormName);
        return selectedForm?.formConfig?.screens || null;
    };

    // Function to get role access mapping from existing role data
    const getRoleAccessMapping = () => {
        const accessMapping = {
            editor: [],
            viewer: [],
            creator: []
        };
        
        // Use the existing role data from searchRoleConfigs
        if (data && Array.isArray(data)) {
            data.forEach(role => {
                const roleCode = role?.data?.code;
                const access = role?.data?.additionalDetails?.access || {};
                
                if (roleCode) {
                    const moduleServicePrefix = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
                    const prefixedRoleCode = `${moduleServicePrefix}_${roleCode.toUpperCase().replace(/\s+/g, '_')}`;
                    
                    if (access.editor) {
                        accessMapping.editor.push(prefixedRoleCode);
                    }
                    if (access.viewer) {
                        accessMapping.viewer.push(prefixedRoleCode);
                    }
                    if (access.creater) { // Note: API has "creater" not "creator"
                        accessMapping.creator.push(prefixedRoleCode);
                    }
                }
            });
        }
        
        // Note: CITIZEN and STUDIO_ADMIN are hardcoded backend roles that are automatically added to workflow actions
        // They should not be included in the service configuration roles mapping
        
        return accessMapping;
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
                        name: field.label?.replace(/\s+/g, '') || field.jsonPath || `field_${screenIndex}_${cardIndex}_${fieldIndex}`,
                        label: field.label || `Field ${fieldIndex + 1}`,
                        required: field.required || false,
                        orderNumber: fieldIndex + 1,
                        disable: field.readOnly || false,
                        defaultValue: field.defaultValue || field.value || "",
                        helpText: field.helpText || "",
                        tooltip: field.tooltip || "",
                        errorMessage: field.errorMessage || ""
                    };
                    // Handle different field types with enhanced mapping
                    switch (field.type) {
                        case "textInput":
                        case "text":
                            fieldConfig.type = "string";
                            fieldConfig.format = "text";
                            if(field?.charCount)fieldConfig.maxLength = field.maxLength ? Number(field.maxLength): 128;
                            if(field?.charCount) fieldConfig.minLength = field.minLength ? Number(field.minLength): 2;
                            if (field.regex && field.errorMessage) {
                                fieldConfig.validation = {
                                    regex: field.regex,
                                    message: field.errorMessage
                                }
                            }
                            break;
                            
                        case "number":
                            fieldConfig.type = "integer";
                            fieldConfig.format = "number";
                            if (field.regex && field.errorMessage) {
                                fieldConfig.validation = {
                                    regex: field.regex,
                                    message: field.errorMessage
                                }
                            }
                            break;
                            
                        case "datePicker":
                        case "date":
                            fieldConfig.type = "date";
                            fieldConfig.format = "date";
                            break;
                            
                        case "mobileNumber":
                            fieldConfig.type = "mobileNumber";
                            fieldConfig.format = "mobileNumber";
                            fieldConfig.maxLength = field.maxLength || 256;
                            fieldConfig.minLength = field.minLength || 0;
                            fieldConfig.prefix = field.isdCodePrefix || "91";
                            if (field.regex && field.errorMessage) {
                                fieldConfig.validation = {
                                    regex: field.regex,
                                    message: field.errorMessage
                                }
                            }
                            break;
                            
                        case "dropdown":
                            if (field.schemaCode) {
                                // MDMS dropdown
                                fieldConfig.type = "string";
                                fieldConfig.format = "radioordropdown";
                                fieldConfig.schema = field.schemaCode;
                                fieldConfig.reference = "mdms";
                            } else if (field.isBoundaryData) {
                                // Boundary data dropdown
                                fieldConfig.type = "string";
                                fieldConfig.format = "radioordropdown";
                                fieldConfig.schema = "common-masters.BoundaryType";
                                fieldConfig.reference = "mdms";
                            } else if (field.dropDownOptions && field.dropDownOptions.length > 0) {
                                // Enum dropdown
                                fieldConfig.type = "enum";
                                fieldConfig.format = "radioordropdown";
                                fieldConfig.values = field.dropDownOptions.map(option => 
                                     option.name || option.value || option.code
                                );
                            } else {
                                // Default dropdown
                                fieldConfig.type = "string";
                                fieldConfig.format = "radioordropdown";
                            }
                            break;
                            
                        case "radio":
                            if (field.schemaCode) {
                                // MDMS radio
                                fieldConfig.type = "string";
                                fieldConfig.format = "radio";
                                fieldConfig.schema = field.schemaCode;
                                fieldConfig.reference = "mdms";
                            } else if (field.dropDownOptions && field.dropDownOptions.length > 0) {
                                // Enum radio
                                fieldConfig.type = "enum";
                                fieldConfig.format = "radio";
                                fieldConfig.values = field.dropDownOptions.map(option => 
                                   option.name || option.value || option.code
                                );
                            } else {
                                // Default radio
                                fieldConfig.type = "string";
                                fieldConfig.format = "radio";
                            }
                            break;
                            
                        case "textarea":
                            fieldConfig.type = "string";
                            fieldConfig.format = "textarea";
                            fieldConfig.maxLength = field.maxLength || 1000;
                            fieldConfig.minLength = field.minLength || 0;
                            break;
                            
                        case "checkbox":
                            fieldConfig.type = "boolean";
                            fieldConfig.format = "checkbox";
                            break;
                            
                        case "fileUpload":
                            fieldConfig.type = "string";
                            fieldConfig.format = "file";
                            fieldConfig.maxSizeInMB = field.maxSizeInMB || 5;
                            fieldConfig.allowedFileTypes = field.allowedFileTypes || ["pdf", "doc", "docx", "jpg", "png"];
                            break;
                            
                        case "amount":
                            fieldConfig.type = "number";
                            fieldConfig.format = "amount";
                            if (field.validation && Object.keys(field.validation).length > 0) {
                                fieldConfig.validation = field.validation;
                            }
                            break;
                            
                        case "email":
                            fieldConfig.type = "string";
                            fieldConfig.format = "email";
                            if (field.validation && Object.keys(field.validation).length > 0) {
                                fieldConfig.validation = field.validation;
                            }
                            break;
                            
                        case "password":
                            fieldConfig.type = "string";
                            fieldConfig.format = "password";
                            fieldConfig.maxLength = field.maxLength || 128;
                            fieldConfig.minLength = field.minLength || 6;
                            break;
                            
                        case "time":
                            fieldConfig.type = "string";
                            fieldConfig.format = "time";
                            break;
                            
                        case "geolocation":
                            fieldConfig.type = "string";
                            fieldConfig.format = "geolocation";
                            break;
                            
                        case "search":
                            fieldConfig.type = "string";
                            fieldConfig.format = "search";
                            break;
                            
                        case "numeric":
                            fieldConfig.type = "integer";
                            fieldConfig.format = "numeric";
                            if (field.validation && Object.keys(field.validation).length > 0) {
                                fieldConfig.validation = field.validation;
                            }
                            break;
                            
                        default:
                            // Default fallback for unknown field types
                            fieldConfig.type = "string";
                            fieldConfig.format = "text";
                            break;
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
    const collectAllRoles = () => {
        const usedRoleCodes = new Set();
        const moduleServicePrefix = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
        
        // Collect role codes from states
        canvasElements.forEach(state => {
            if (state.roles && Array.isArray(state.roles)) {
                state.roles.forEach(role => {
                    if (role.code) {
                        const roleCode = role.code.toUpperCase().replace(/\s+/g, '_');
                        usedRoleCodes.add(`${moduleServicePrefix}_${roleCode}`);
                    }
                });
            }
        });
        
        // Collect role codes from connections/actions
        connections.forEach(connection => {
            if (connection.aroles && Array.isArray(connection.aroles)) {
                connection.aroles.forEach(role => {
                    if (role.code) {
                        const roleCode = role.code.toUpperCase().replace(/\s+/g, '_');
                        usedRoleCodes.add(`${moduleServicePrefix}_${roleCode}`);
                    }
                });
            }
        });
        
        // Get access mapping from existing role data
        const accessMapping = getRoleAccessMapping();
        
        // Filter access mapping to only include roles that are actually used in the workflow
        const filteredAccessMapping = {
            editor: accessMapping.editor.filter(role => usedRoleCodes.has(role)),
            viewer: accessMapping.viewer.filter(role => usedRoleCodes.has(role)),
            creator: accessMapping.creator.filter(role => usedRoleCodes.has(role))
        };
        
        // Note: CITIZEN and STUDIO_ADMIN are hardcoded backend roles that are automatically added to workflow actions
        // They should not be included in the service configuration roles mapping
        
        return filteredAccessMapping;
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

    const generateGroupedTemplates = (notifications) => {
        const grouped = {
            sms: [],
            email: [],
            push: [],
        };
        
        // Find states that have notifications selected
        const statesWithNotifications = canvasElements.filter(state => 
            state.sendnotif && state.sendnotif.length > 0
        );
        
        // Only include notifications that are actually selected in any state
        notifications.forEach((item) => {
            const type = item.additionalDetails?.type;
            if (!type || !grouped[type]) return;
            
            // Find which states use this notification
            const statesUsingThisNotification = statesWithNotifications
                .filter(state => state.sendnotif && state.sendnotif.some(notif => notif.code === item.title))
                .map(state => state.name.toUpperCase().replace(/\s+/g, '_'));
            
            // Only add notification if it's used in at least one state
            if (statesUsingThisNotification.length > 0) {
                const template = {
                    code: item.title || "",
                    states: statesUsingThisNotification,
                    template: item.messageBody || "",
                };
                grouped[type].push(template);
            }
        });
        
        // If no notifications are configured, provide empty arrays
        return {
            sms: grouped.sms || [],
            push: grouped.push || [],
            email: grouped.email || []
        };
    };

    // Function to generate complete service configuration
    const generateServiceConfiguration = async () => {
        // Get existing console outputs
        const workflowData = transformWorkflowData(canvasElements, connections);
        const documentData = documentConfig(connections, `${roleModule}${roleService}`);
        
        // Get form data from start state
        const formDataFromStartState = getFormDataFromStartState();
        const formFields = transformFormToFields(formDataFromStartState);
        
        // Check for specific sections in form
        const { hasAddressDetails, hasApplicantDetails } = checkFormSections(formDataFromStartState);
        
        // Transform roles to the format expected in service config
        const accessMapping = collectAllRoles();
        
        // Get module and service from URL parameters
        const moduleName = roleModule.toLowerCase();
        const serviceName = roleService.toLowerCase();
        
        // Get UI configurations from existing draft
        const existingDraft = FormData?.mdms?.[0];
        const uiConfigurations = {
            uiforms: existingDraft?.data?.uiforms || [],
            uichecklists: existingDraft?.data?.uichecklists || [],
            uiroles: existingDraft?.data?.uiroles || [],
            uinotifications: existingDraft?.data?.uinotifications || [],
            uiworkflow: {
                canvasElements: canvasElements,
                connections: connections
            }
        };
        
        const serviceConfig = {
            module: roleModule,
            service: roleService,
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
                    format: `${moduleName}-${serviceName}-app-[cy:yyyy-MM-dd]-[SEQ_PUBLIC_APPLICATION]`, 
                    idname: `${moduleName}-${serviceName}.application.${serviceName}.applicationapp.id`
                },
                {
                    type: "service",
                    format: `${moduleName}-${serviceName}-svc-[cy:yyyy-MM-dd]-[SEQ_PUBLIC_APPLICATION]`,
                    idname: `${moduleName}-${serviceName}.application.${serviceName}.applicationservice.id`
                }
            ],
            localization: {
                modules: [`digit-studio`]
            },
            notification: generateGroupedTemplates(notif),
            ...(hasAddressDetails && {
                boundary: {
                    lowestLevel: "locality",
                    hierarchyType: "REVENUE"
                }
            }),
            ...(hasApplicantDetails && {
                applicant: {
                    types: ["individual", "organisation"],
                    config: {
                        systemUser: true,
                        systemRoles: ["CITIZEN"],
                        systemUserType: "CITIZEN"
                    },
                    maximum: 3,
                    minimum: 1
                }
            }),
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
            ],
            "pdf": [
                {
                    "key": "tl-application",
                    "type": "application",
                    "states": [
                        "applied",
                        "approved"
                    ]
                },
                {
                    "key": "tl-bill",
                    "type": "bill",
                    "states": [
                        "approved"
                    ]
                },
                {
                    "key": "tl-receipt",
                    "type": "receipt",
                    "states": [
                        "approved"
                    ]
                }
            ],
            "bill": {
                "taxHead": [
                    {
                        "code": "applicationFee",
                        "name": "applicationFee",
                        "order": "2",
                        "isDebit": false,
                        "service": "TESTBSONE",
                        "category": "TAX",
                        "isRequired": false,
                        "isActualDemand": true
                    }
                ],
                "taxPeriod": [
                    {
                        "code": "TEST2018",
                        "toDate": 1554076799000,
                        "service": "TESTBSONE",
                        "fromDate": 1522540800000,
                        "periodCycle": "ANNUAL",
                        "financialYear": "2018-19"
                    }
                ],
                "BusinessService": {
                    "code": "TESTBSONE",
                    "businessService": "TESTBSONE",
                    "demandUpdateTime": 86400000,
                    "isAdvanceAllowed": false,
                    "minAmountPayable": 100,
                    "partPaymentAllowed": true,
                    "isVoucherCreationEnabled": true,
                    "collectionModesNotAllowed": [
                        "DD",
                        "OFFLINE_NEFT",
                        "OFFLINE_RTGS",
                        "POSTAL_ORDER"
                    ]
                }
            },
            "inbox": {
                "index": "public-service-index",
                "module": "public-service",
                "sortBy": {
                    "path": "Data.auditDetails.createdTime",
                    "defaultOrder": "DESC"
                },
                "sourceFilterPathList": [
                    "Data.businessService",
                    "Data.applicationNumber",
                    "Data.currentProcessInstance",
                    "Data.auditDetails",
                    "Data.additionalDetails",
                    "Data.module",
                    "Data.locality",
                    "Data.status"
                ],
                "allowedSearchCriteria": [
                    {
                        "name": "tenantId",
                        "path": "Data.tenantId.keyword",
                        "operator": "EQUAL",
                        "isMandatory": true
                    },
                    {
                        "name": "status",
                        "path": "Data.workflowStatus",
                        "isMandatory": false
                    },
                    {
                        "name": "applicationNumber",
                        "path": "Data.applicationNumber.keyword",
                        "isMandatory": false
                    },
                    {
                        "name": "module",
                        "path": "Data.module.keyword",
                        "isMandatory": false
                    },
                    {
                        "name": "businessService",
                        "path": "Data.businessService.keyword",
                        "isMandatory": false
                    },
                    {
                        "name": "locality",
                        "path": "Data.address.locality.keyword",
                        "isMandatory": false
                    },
                    {
                        "name": "assignee",
                        "path": "Data.currentProcessInstance.assignes.uuid.keyword",
                        "isMandatory": false
                    }
                ]
            },
            "payment": {
                "gateway": "TODO"
            }
        };
        
        // Add UI configurations to service config
        serviceConfig.uiforms = uiConfigurations.uiforms;
        serviceConfig.uichecklists = uiConfigurations.uichecklists;
        serviceConfig.uiroles = uiConfigurations.uiroles;
        serviceConfig.uinotifications = uiConfigurations.uinotifications;
        serviceConfig.uiworkflow = uiConfigurations.uiworkflow;
        
        // Generate checklist configuration
        const checklistConfig = [];
        canvasElements.forEach(state => {
            if (state.checklist && state.checklist.length > 0) {
                state.checklist.forEach(checklistItem => {
                    // Find the full checklist data from uichecklists
                    const fullChecklistData = uiConfigurations.uichecklists.find(
                        checklist => checklist.name === checklistItem.name
                    );
                    
                    const checklistEntry = {
                        name: checklistItem.name,
                        state: state.name.toUpperCase().replace(/\s+/g, '_'), // State name in uppercase with underscores
                        checklistData: fullChecklistData || null // Include the full checklist object
                    };
                    checklistConfig.push(checklistEntry);
                });
            }
        });
        serviceConfig.checklist = checklistConfig;
        
        
        return serviceConfig;
    };

    // const getWrorkflowData = async () => {
    //     try {
    //         // Show loader
    //         setIsGeneratingConfig(true);
            
    //         // Generate service configuration automatically
    //         const serviceConfig = await generateServiceConfiguration();
            
    //         // Create a copy for popup display without canvas and connections
    //         const displayConfig = JSON.parse(JSON.stringify(serviceConfig));
    //         if (displayConfig.workflow) {
    //             delete displayConfig.workflow.canvasElements;
    //             delete displayConfig.workflow.connections;
    //         }
            
    //         setServiceConfigData(serviceConfig);
    //         setEditableServiceConfig(JSON.stringify(displayConfig, null, 2));
            
    //         // Show the popup with the generated configuration
    //         setShowServiceConfigPopup(true);
    //     } catch (error) {
    //         console.error("Error generating service configuration:", error);
    //         setShowToast({
    //             type: "error",
    //             label: "SERVICE_CONFIG_GENERATION_FAILED"
    //         });
    //     } finally {
    //         // Hide loader
    //         setIsGeneratingConfig(false);
    //     }
    // };

    // Function to check for inline errors in property panel and canvas elements
    const checkForInlineErrors = () => {
        const errors = [];
        
        // Check for state property errors in the currently selected element
        if (selectedElement && selectedElement.type === "node") {
            if (stateData.name === "") {
                errors.push("State name is required");
            }
            if (stateData.sla < 1) {
                errors.push("SLA must be at least 1 hour");
            }
        }
        
        // Check for action property errors in the currently selected element
        if (selectedElement && selectedElement.type === "action") {
            if (actionData.label === "") {
                errors.push("Action name is required");
            }
        }
        
        // Check for role property errors in the currently selected element
        if (rolePopup && roleData.name === "") {
            errors.push("Role name is required");
        }
        if (rolePopup && !roleData.creater && !roleData.editor && !roleData.viewer) {
            errors.push("At least one role permission must be selected");
        }
        
        // Check for errors in all canvas elements
        canvasElements.forEach((element, index) => {
            if (element.name === "" || element.name === undefined) {
                errors.push(`State ${index + 1} name is required`);
            }
            if (element.sla < 1) {
                errors.push(`State ${index + 1} SLA must be at least 1 hour`);
            }
        });
        
        // Check for errors in all connections
        connections.forEach((connection, index) => {
            if (connection.label === "" || connection.label === undefined) {
                errors.push(`Action ${index + 1} name is required`);
            }
        });
        
        return errors;
    };

    const getWrorkflowData = async () => {
        try {
            // --- VALIDATIONS BEFORE GENERATING CONFIG ---
            
            // 0. Check for inline errors in property panel
            const inlineErrors = checkForInlineErrors();
            if (inlineErrors.length > 0) {
                setShowToast({
                    type: "error",
                    label: t("STUDIO_WORKFLOW_INCOMPLETE_ERR")
                });
                return; // stop execution
            }
            
            // 1. Check if start node, connections, and processing node are valid
            const startNode = canvasElements.find(node => node.nodetype === "start");
            const hasConnections = connections && connections.length > 0;
    
            // Processing node validation: must have at least one incoming and one outgoing connection
            const processingNodes = canvasElements.filter(node => node.nodetype === "intermediate");
            const invalidProcessing = processingNodes.some(node => {
                const incoming = connections.some(conn => String(conn.to) === String(node.id));
                const outgoing = connections.some(conn => String(conn.from) === String(node.id));
            
                if (node.nodetype === "start") return !outgoing; // only needs outgoing
                if (node.nodetype === "end") return !incoming;   // only needs incoming
                return !(incoming && outgoing); // intermediates need both
            });
    
            if (!startNode || !hasConnections || invalidProcessing || showToast?.type === "error") {
                setShowToast({
                    type: "error",
                    label: t("STUDIO_WORKFLOW_INCOMPLETE_ERR")
                });
                return; // stop execution
            }
    
            // 2. Check if all nodes have roles assigned
            const nodesWithoutRoles = canvasElements.filter(node => !node.roles || node.roles.length === 0);

            if (nodesWithoutRoles.length > 0) {
                setShowToast({
                    type: "error",
                    label: t("STUDIO_NODES_WITHOUT_ROLES_ERR")
                });
                return;
            }
    
            // 3. Check if a valid form is selected
            const formDataFromStartState = getFormDataFromStartState();
            if (!formDataFromStartState || formDataFromStartState.length === 0) {
                setShowToast({
                    type: "error",
                    label: t("STUDIO_NO_FORM_SELECTED_ERR")
                });
                return; // stop execution
            }
    
            // --- SHOW LOADER ---
            setIsGeneratingConfig(true);
            
            // Generate service configuration
            const serviceConfig = await generateServiceConfiguration();
    
            // Create display copy without UI configurations for popup
            const displayConfig = JSON.parse(JSON.stringify(serviceConfig));
            
            // Remove UI configurations from display
            delete displayConfig.uiforms;
            delete displayConfig.uichecklists;
            delete displayConfig.uiroles;
            delete displayConfig.uinotifications;
            delete displayConfig.uiworkflow;
            
            // Keep checklist configuration in display (it should be visible in popup)
            // checklist configuration is already added to serviceConfig and will be in displayConfig
            
            // Also remove workflow canvas/connections if they exist
            if (displayConfig.workflow) {
                delete displayConfig.workflow.canvasElements;
                delete displayConfig.workflow.connections;
            }
    
            setServiceConfigData(serviceConfig);
            setEditableServiceConfig(JSON.stringify(displayConfig, null, 2));
            setShowServiceConfigPopup(true);
        } catch (error) {
            console.error("Error generating service configuration:", error);
            setShowToast({
                type: "error",
                label: "SERVICE_CONFIG_GENERATION_FAILED"
            });
        } finally {
            setIsGeneratingConfig(false); // Hide loader
        }
    };

    const handleSaveServiceConfig = async () => {
        try {
            setIsSaving(true);
            
            let parsedConfig;
            try {
                parsedConfig = JSON.parse(editableServiceConfig);
            } catch (error) {
                setShowToast({
                    type: "error",
                    label: "INVALID_JSON_FORMAT"
                });
                return;
            }

            // Use the full service config (with canvas and connections) for API call
            const fullServiceConfig = serviceConfigData;

            if (existingServiceConfigId) {
                // Update existing service config
                await updateServiceConfig.mutateAsync({
                    serviceConfigData: fullServiceConfig,
                    existingConfig: existingServiceConfig
                });
                setShowToast({
                    type: "success",
                    label: "SERVICE_CONFIG_UPDATED_SUCCESSFULLY"
                });
                setTimeout(() => {
                    history.push(`/${window.contextPath}/employee/servicedesigner/LandingPage`);
                }, 3000);
            } else {
                // Create new service config
                await saveServiceConfig.mutateAsync(fullServiceConfig);
                setShowToast({
                    type: "success",
                    label: "SERVICE_CONFIG_SAVED_SUCCESSFULLY"
                });
                setTimeout(() => {
                    history.push(`/${window.contextPath}/employee/servicedesigner/LandingPage`);
                }, 3000);
            }
            
            setShowServiceConfigPopup(false);
        } catch (error) {
            console.error("Error saving service configuration:", error);
            setShowToast({
                type: "error",
                label: "SERVICE_CONFIG_SAVE_FAILED"
            });
        } finally {
            setIsSaving(false);
        }
    };

    //changes for publish
    const handlePublishServiceConfig = async () => {
        try {
            setIsPublishing(true);
            
            // Parse the service configuration
            let serviceConfigData;
            try {
                serviceConfigData = JSON.parse(editableServiceConfig);
            } catch (error) {
                setShowToast({
                    type: "error",
                    label: "INVALID_JSON_FORMAT"
                });
                return;
            }

            // Get current user info and tenant ID
            const tenantId = Digit.ULBService.getCurrentTenantId();
            
            // Prepare MDMS create payload following the same pattern as useServiceConfigAPI
            const mdmsPayload = {
                Mdms: {
                    tenantId: tenantId,
                    schemaCode: "Studio.ServiceConfiguration",
                    data: serviceConfigData
                }
            };

            // Make MDMS create call using the same pattern as the existing API calls
            const mdmsContextPath = window?.globalConfigs?.getConfig("MDMS_CONTEXT_PATH") || "egov-mdms-service";
            const mdmsResponse = await Digit.CustomService.getResponse({
                url: `/${mdmsContextPath}/v2/_create/Studio.ServiceConfiguration`,
                body: mdmsPayload
            });

            if (mdmsResponse) {
                // Make service API call using mutation hook
                await serviceCreationMutation.mutateAsync({
                    body: {
                        service: {
                            tenantId: tenantId,
                            businessService: serviceConfigData.service,
                            module: serviceConfigData.module,
                            status: "ACTIVE",
                            additionalDetails: {
                                note: "initial creation"
                            }
                        }
                    }
                });

                setShowToast({
                    type: "success",
                    label: "SERVICE_CONFIG_PUBLISHED_SUCCESSFULLY"
                });
                setTimeout(() => {
                    history.push(`/${window.contextPath}/employee/servicedesigner/LandingPage`);
                }, 3000);
            } else {
                throw new Error("MDMS API call failed");
            }
            
            setShowServiceConfigPopup(false);
        } catch (error) {
            console.error("Error publishing service configuration:", error);
            setShowToast({
                type: "error",
                label: "SERVICE_CONFIG_PUBLISH_FAILED"
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const onLoadSample =() =>{
        setLoadSamplePopup(true);
    }

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
        
        // Debug: Log canvas elements and connections
    }, [canvasElements, connections]);

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

    if (isLoading || moduleListLoading || isConfigLoad) {
        return <Loader />;
    }
    return (
        <Card style={{ flex: 1, marginRight: "1rem", border: '0.063rem solid #d6d5d4',height: "830px" }} className="Workflow-card">
            <Card className="Workflow-card" style={{height: "830px"}}>
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
                onLoadSample={onLoadSample}
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
                    defaultOpenWidth={335}
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
                    style={{ zIndex: 9999 }}
                />
            )}
            
            {/* Service Configuration Popup */}
            {showServiceConfigPopup && (
                <PopUp
                    header={t("SERVICE_CONFIGURATION")}
                    headerBarMain={t("EDITABLE_SERVICE_CONFIG")}
                    actionCancelLabel={t("CLOSE")}
                    actionCancelOnSubmit={() => setShowServiceConfigPopup(false)}
                    onClose={() => setShowServiceConfigPopup(false)}
                    children={[
                        isGeneratingConfig ? (
                            <div key="service-config-loader" style={{ 
                                display: "flex", 
                                justifyContent: "center", 
                                alignItems: "center", 
                                padding: "3rem",
                                flexDirection: "column"
                            }}>
                                <Loader />
                                <div style={{ marginTop: "1rem", color: "#666" }}>
                                    {t("GENERATING_SERVICE_CONFIGURATION")}...
                                </div>
                            </div>
                        ) : (
                            <div key="service-config-preview" style={{ 
                                background: "#f8f9fa", 
                                padding: "1rem", 
                                borderRadius: "8px", 
                                maxHeight: "70vh", 
                                overflow: "auto",
                                border: "1px solid #e9ecef"
                            }}>
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center", 
                                    marginBottom: "1rem" 
                                }}>
                                    <h4 style={{ color: "#495057", margin: 0 }}>
                                        {t("EDITABLE_SERVICE_CONFIGURATION")}
                                    </h4>
                                    <div style={{ color: "#666", fontSize: "12px" }}>
                                        Config Length: {editableServiceConfig.length} characters
                                    </div>
                                </div>
                                
                                <textarea
                                    value={editableServiceConfig}
                                    onChange={(e) => setEditableServiceConfig(e.target.value)}
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: "12px",
                                        lineHeight: "1.4",
                                        minHeight: "50vh",
                                        width: "100%",
                                        backgroundColor: "#fff",
                                        border: "1px solid #ced4da",
                                        borderRadius: "4px",
                                        padding: "0.5rem",
                                        resize: "vertical",
                                        marginBottom: "1rem"
                                    }}
                                    placeholder="Edit service configuration JSON..."
                                />
                                
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "flex-end", 
                                    gap: "0.5rem",
                                    paddingTop: "1rem",
                                    borderTop: "1px solid #e9ecef"
                                }}>
                                    <Button
                                        variation="secondary"
                                        label={t("CLOSE")}
                                        onClick={() => setShowServiceConfigPopup(false)}
                                    />
                                    <Button
                                        variation="secondary"
                                        label={isSaving ? t("SAVING") : t("SAVE")}
                                        onClick={handleSaveServiceConfig}
                                        isDisabled={isSaving || isPublishing}
                                    />
                                    <Button
                                        variation="primary"
                                        label={isPublishing ? t("PUBLISHING") : t("PUBLISH")}
                                        onClick={handlePublishServiceConfig}
                                        isDisabled={isSaving || isPublishing}
                                    />
                                </div>
                            </div>
                        )
                    ]}
                />
            )}

            {/* Role Popup */}
            {rolePopup && (
                <PopUp
                    type={"default"}
                    heading={t("CREATE_NEW_ROLE")}
                    children={[]}
                    style={{ width: "40rem" }}
                    onOverlayClick={() => {
                        setRoleData({
                            name: "",
                            desc: "",
                            viewer: false,
                            editor: false,
                            creater: false,
                        });
                        setRolePopup(false);
                    }}
                    onClose={() => {
                        setRoleData({
                            name: "",
                            desc: "",
                            viewer: false,
                            editor: false,
                            creater: false,
                        });
                        setRolePopup(false);
                    }}
                    footerChildren={[
                        <Button
                            type={"button"}
                            size={"large"}
                            variation={"secondary"}
                            label={t("CREATE_ROLE")}
                            onClick={(e) => {createRole(e)}}
                        />
                    ]}
                    sortFooterChildren={true}
                >
                    <FieldV1
                        error={roleData.name == "" ? t("PLEASE_ENTER_ROLE_NAME") : ""}
                        label={t("ROLE_NAME")}
                        onChange={(e) => onRoleChange(e)}
                        populators={{
                            name: "name",
                            alignFieldPairVerically: true,
                            fieldPairClassName: "workflow-field-pair",
                        }}
                        props={{
                            fieldStyle: { width: "100%" }
                        }}
                        required
                        type="text"
                        value={roleData.name}
                    />
                    <FieldV1
                        label={t("ROLE_DESC")}
                        onChange={(e) => onRoleChange(e)}
                        populators={{
                            name: "desc",
                            alignFieldPairVerically: true,
                            fieldPairClassName: "workflow-field-pair",
                        }}
                        props={{
                            fieldStyle: { width: "100%" }
                        }}
                        type="text"
                        value={roleData.desc}
                    />
                    <AccessCard data={roleData} onChange={onRoleChange} />
                </PopUp>
            )}
            
            {/* loadSample Popup */}
            {loadSamplePopup && (
                <PopUp
                    type={"default"}
                    heading={t("LOAD_SAMPLE_HEADER")}
                    children={[]}
                    style={{ width: "40rem" }}
                    onOverlayClick={() => { setLoadSamplePopup(false); }}
                    onClose={() => { setLoadSamplePopup(false); }}
                    footerChildren={{}}
                    sortFooterChildren={true}
                >
                </PopUp>
            )}
        </Card>
    );
};

export default Workflow;