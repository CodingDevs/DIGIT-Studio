import React, { useState, useEffect, useRef } from "react";
import { Card } from "@egovernments/digit-ui-react-components";
import { CardText, Loader, Toast } from "@egovernments/digit-ui-components";
import RoleComp from "../../components/rolesComponent";
import { useTranslation } from "react-i18next";
import { PopUp } from "@egovernments/digit-ui-components";
import { SidePanel } from "@egovernments/digit-ui-components";
import { FieldV1 } from "@egovernments/digit-ui-components";
import AccessCard from "../../components/AccessCard";
import { CardHeader } from "@egovernments/digit-ui-react-components";
import { Button } from "@egovernments/digit-ui-components";
import { useRoleConfigAPI } from "../../hooks/useRoleConfigAPI";
import { AlertCard } from "@egovernments/digit-ui-components";

const Roles = () => {
    const { t } = useTranslation();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const searchParams = new URLSearchParams(location.search);
    const roleModule = searchParams.get("module") || "Studio";
    const roleService = searchParams.get("service") || "Service";
    const roleCategory = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
    const [showToast, setShowToast] = useState(null);
    const [selectedElement, setSelectedElement] = useState(false);
    const [stateData, setStateData] = useState({
        name: "",
        desc: "",
        isNew: false,
        editor: false,
        viewer: false,
        creater: false,
        originalName: "" // Store the original role name for updates
    });
    const [rolePopup, setRolePopup] = useState(false);

    // Use the new role config API hook
    const { saveRoleConfig, updateRoleConfig, searchRoleConfigs, searchRoleConfigByName } = useRoleConfigAPI();
    const { data: roleConfigs, isLoading: moduleListLoading } = searchRoleConfigs(roleModule, roleService);
    const roleCodes = roleConfigs?.map(role => role?.data) || [];

    const onDataChange = (e) => {
        if (Array.isArray(e)) {
            setStateData(prev => ({
                ...prev,
                [e[0]]: e[1].target.checked
            }));
        }
        else if (e?.target) {
            const { name, value } = e.target;
            setStateData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const onClick = (name, desc, isNew, editor, viewer, creater) => {
        if (isNew) {
            setRolePopup(true);
            setStateData({
                name: "",
                desc: "",
                isNew: true,
                editor: false,
                viewer: false,
                creater: false,
                originalName: ""
            });
        }
        else {
            setSelectedElement(true);
            setStateData({ 
                name, 
                desc, 
                isNew, 
                editor, 
                viewer, 
                creater,
                originalName: name // Store the original name for updates
            });
        }
    }

    const generateRolePayload = (roleName, description, access, oldRoleName = null) => {
        return {
            module: roleModule,
            service: roleService,
            roleName: roleName,
            description: description,
            access: access,
            oldRoleName: oldRoleName
        };
    };

    const createRole = async (e) => {
        if (stateData.name != "" && (stateData.creater || stateData.editor || stateData.viewer)) {
            const access = {
                editor: stateData.editor,
                viewer: stateData.viewer,
                creater: stateData.creater
            };

            if (stateData.isNew == true) {
                // Check if role name already exists
                const existingRole = roleCodes.find(role => role.code.toUpperCase() === stateData.name.toUpperCase());
                if (existingRole) {
                    setShowToast({ key: true, type: "error", label: t("ROLE_NAME_EXISTS") });
                }
                else {
                    try {
                        const rolePayload = generateRolePayload(stateData.name, stateData.desc, access);
                        const response = await saveRoleConfig.mutateAsync(rolePayload);
                        
                        if (response?.mdms) {
                            setShowToast({ key: true, type: "success", label: t("ROLE_ADDED_SUCCESSFULLY") });
                            setStateData({
                                name: "",
                                desc: "",
                                isNew: false,
                                viewer: false,
                                editor: false,
                                creater: false,
                                originalName: "",
                            });
                            setRolePopup(false);
                            setSelectedElement(false);
                            window.location.reload();
                        }
                        else {
                            setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_CREATION") });
                            setStateData({
                                name: "",
                                desc: "",
                                isNew: false,
                                viewer: false,
                                editor: false,
                                creater: false,
                                originalName: "",
                            });
                            setRolePopup(false);
                        }
                    } catch (error) {
                        setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_CREATION") });
                        setStateData({
                            name: "",
                            desc: "",
                            isNew: false,
                            viewer: false,
                            editor: false,
                            creater: false,
                            originalName: "",
                        });
                        setRolePopup(false);
                    }
                }
            }
            else {
                try {
                    const rolePayload = generateRolePayload(stateData.name, stateData.desc, access, stateData.originalName);
                    const response = await updateRoleConfig.mutateAsync(rolePayload);
                    
                    if (response?.mdms) {
                        setShowToast({ key: true, type: "success", label: t("ROLE_UPDATED_SUCCESSFULLY") });
                        setSelectedElement(false);
                        window.location.reload();
                    }
                    else {
                        setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_UPDATION") });
                    }
                } catch (error) {
                    setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_UPDATION") });
                }
            }
        }
        else {
            if (stateData.name == "") {
                setShowToast({ key: true, type: "error", label: t("ROLE_NAME_IS_REQUIRED") });
            }
            else {
                setShowToast({ key: true, type: "error", label: t("ATLEAST_ONE_IS_SELECTED") });
            }
        }
    }

    const cancel = (e) => {
        setSelectedElement(false);
        setStateData({
            name: "",
            desc: "",
            isNew: false,
            editor: false,
            viewer: false,
            creater: false,
            originalName: ""
        });
    }

    const Node_Properties_Section = [
        [
            <FieldV1
                //error={stateData.name == "" ? t("PLEASE_ENTER_ROLE_NAME") : ""}
                label={t("ROLE_NAME")}
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
                infoMessage={t("ROLE_NAME_INFO")}
                type="text"
                value={stateData.name}
            />,
            <FieldV1
                label={t("ROLE_DESC")}
                onChange={(e) => onDataChange(e)}
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
                infoMessage={t("ROLE_DESC_INFO")}
                value={stateData.desc}
            />,
            <AccessCard data={stateData} onChange={onDataChange} />,
            <Button
                variation="primary"
                label={t("EDIT_ROLE")}
                type="button"
                className="primary-button"
                style={{ width: "100%" }}
                onClick={(e) => createRole(e)}
            />
        ]
    ]

    if (moduleListLoading) {
        return <Loader />
    }
    return (
        <React.Fragment>
            <CardHeader styles={{ fontSize: "xx-large", fontWeight: "bold", paddingTop: "24px", marginBottom: "0px" }}>{t("ROLES_HEADER")}</CardHeader>
            <CardText>{t("ROLES_HEADER_DESCRIPTION")}</CardText>
            {!selectedElement && <AlertCard
                style={{ margin: "24px 0px" }}
                label={t("GETTING_STARTED")}
                text={t("GETTING_STARTED_DESC")}
                className={"uploadWidget-error-card"}
            />
            }
            <div style={{ display: "flex", minHeight: "670px" }}>
                <Card style={{ flex: 1, minHeight: "670px", display: "flex", flexDirection: "column" }} className="Workflow-card">
                    <div style={{ flex: 1, overflow: "auto" }}>
                        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", padding: "24px", gap: "16px" }}>
                            <RoleComp role={t("CREATE_ROLE")} desc={t("ADD_NEW")} isNew={true} onRoleClick={onClick} />
                            {roleCodes.map((role, index) =>
                                <RoleComp key={role.code || index} role={t(role.code)} desc={t(role.description)} data={role} onRoleClick={onClick} />
                            )}
                        </div>
                    </div>
                </Card>
                {selectedElement && (
                    <div className="Workflow-card" style={{ 
                        margin: "0px 24px", 
                        minHeight: "670px",
                        display: "flex",
                        flexDirection: "column",
                        minWidth: "400px",
                        maxWidth: "500px"
                    }}>
                        <SidePanel
                            type="static"
                            position="right"
                            isDraggable={true}
                            sections={Node_Properties_Section}
                            addClose={true}
                            onClose={cancel}
                            header={[
                                <div className="typography heading-m" style={{ color: "#0B4B66", marginLeft: "0px" }}>
                                    <div >{t("EDIT_HEADING")}</div>
                                </div>,
                                <div className="typography heading-s" style={{ color: "#0B4B66" }}>
                                    <div >{t("EDIT_HEADING_DESC")}</div>
                                </div>
                            ]}
                            isOverlay={false}
                            hideScrollIcon={true}
                            hideArrow={false}
                            className="slider-container"
                            style={{ 
                                height: "100%",
                                maxHeight: "670px",
                                overflow: "auto"
                            }}
                        />
                    </div>
                )}
            </div>
            {/*Create role Popup */}
            {rolePopup && (
                <PopUp
                    type={"default"}
                    heading={t("CREATE_NEW_ROLE")}
                    children={[]}
                    style={{ width: "30rem" }}
                    footerStyles={{ width: "100%" }}
                    onOverlayClick={() => {
                        setStateData({
                            name: "",
                            desc: "",
                            isNew: true,
                            viewer: false,
                            editor: false,
                            creater: false,
                            originalName: "",
                        });
                        setRolePopup(false);
                    }}
                    onClose={() => {
                        setStateData({
                            name: "",
                            desc: "",
                            isNew: true,
                            viewer: false,
                            editor: false,
                            creater: false,
                            originalName: "",
                        });
                        setRolePopup(false);
                    }}
                    footerChildren={[
                        <div style={{ display: "flex", width: "100%" }}>
                            <Button
                                type={"button"}
                                size={"large"}
                                variation={"primary"}
                                label={t("CREATE_ROLE")}
                                style={{ margin: "0 8px", borderRadius: "6px", width: "100%" }}
                                onClick={(e) => { createRole(e) }}
                            />
                            <Button
                                type={"button"}
                                size={"large"}
                                variation={"secondary"}
                                style={{ margin: "0 8px", borderRadius: "6px", width: "100%" }}
                                label={t("CANCEL")}
                                onClick={(e) => setRolePopup(false)}
                            />
                        </div>
                    ]}
                    sortFooterChildren={true}
                >
                    <FieldV1
                        //error={stateData.name == "" ? t("PLEASE_ENTER_ROLE_NAME") : ""}
                        label={t("ROLE_NAME")}
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
                        type="text"
                        infoMessage={t("ROLE_NAME_INFO")}
                        value={stateData.name}
                    />
                    <FieldV1
                        label={t("ROLE_DESC")}
                        onChange={(e) => onDataChange(e)}
                        populators={{
                            name: "desc",
                            alignFieldPairVerically: true,
                            fieldPairClassName: "workflow-field-pair",
                        }}
                        props={{
                            fieldStyle: { width: "100%" }
                        }}
                        type="text"
                        infoMessage={t("ROLE_DESC_INFO")}
                        value={stateData.desc}
                    />
                    <AccessCard data={stateData} onChange={onDataChange} />
                </PopUp>
            )}
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
        </React.Fragment>
    );
};

export default Roles;