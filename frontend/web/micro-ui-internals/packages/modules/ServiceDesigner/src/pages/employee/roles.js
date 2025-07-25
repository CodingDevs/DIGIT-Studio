import React, { useState, useEffect, useRef } from "react";
import { Card } from "@egovernments/digit-ui-react-components";
import { Loader, Toast } from "@egovernments/digit-ui-components";
import RoleComp from "../../components/rolesComponent";
import { useTranslation } from "react-i18next";
import { CustomSVG } from "@egovernments/digit-ui-components";
import { SidePanel } from "@egovernments/digit-ui-components";
import { FieldV1 } from "@egovernments/digit-ui-components";
import AccessCard from "../../components/AccessCard";
import { Button } from "@egovernments/digit-ui-components";
import generateMdmsRolePayload from "../../config/rolecreateConfig";

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
        editor: true,
        viewer: false,
        creater: false
    });
    const MDMS_CONTEXT_PATH = window?.globalConfigs?.getConfig("MDMS_CONTEXT_PATH") || "egov-mdms-service";

    const requestCriteria = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "studio.roles"
            },
        },
    };
    const { isLoading: moduleListLoading, data: dataa } = Digit.Hooks.useCustomAPIHook(requestCriteria);
    const roleCodes = dataa?.mdms?.filter(role => role?.data?.category === roleCategory)?.map(role => role?.data);

    const heading = [
        {
            head: t("NEW_HEAD"),
            desc: t("NEW_HEAD_DESC"),
        },
        {
            head: t("EDIT_HEAD"),
            desc: t("EDIT_HEAD_DESC"),
        }
    ]

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
        setSelectedElement(true);
        setStateData({ name, desc, isNew, editor, viewer, creater });
    }

    const createMdmsRole = async (req, isUpdate) => {
        try {
            const response = await Digit.CustomService.getResponse({
                url: !isUpdate ? `/${MDMS_CONTEXT_PATH}/v2/_update/studio.roles` : `/${MDMS_CONTEXT_PATH}/v2/_create/studio.roles`,
                body: {
                    ...req
                },
            });
            return { success: true, data: response };
        } catch (error) {
            const errorCode = error?.response?.data?.Errors?.[0]?.code || "Unknown error";
            const errorDescription = error?.response?.data?.Errors?.[0]?.description || "An error occurred";
            return { success: false, error: { code: errorCode, description: errorDescription } };
        }
    };

    const createRole = async (e) => {
        if (stateData.name != "" && (stateData.creater || stateData.editor || stateData.viewer)) {
            if (stateData.isNew == true) {
                if (dataa?.mdms?.filter(role => role?.data?.category === roleCategory)?.some(role => role?.data?.code.toUpperCase() === stateData.name.toUpperCase())) {
                    setShowToast({ key: true, type: "error", label: t("ROLE_NAME_EXISTS") });
                }
                else {
                    const response = await createMdmsRole(generateMdmsRolePayload(tenantId, Math.floor(100 + Math.random() * 900), roleCategory, stateData, dataa?.mdms?.filter(role => role?.data?.category === roleCategory && role?.data?.code.toUpperCase() === stateData.name.toUpperCase())?.map(role => role)), stateData.isNew);
                    if(response?.success){
                        setShowToast({ key: true, type: "success", label: t("ROLE_ADDED_SUCCESSFULLY") });
                    }
                    else{
                        setShowToast({ key: true, type: "error", label: t("ERROR_OCCURED_DURING_CREATION") });
                    }
                }
            }
            else {
                const response = await createMdmsRole(generateMdmsRolePayload(tenantId, Math.floor(100 + Math.random() * 900), roleCategory, stateData, dataa?.mdms?.filter(role => role?.data?.category === roleCategory && role?.data?.code.toUpperCase() === stateData.name.toUpperCase())?.map(role => role)), stateData.isNew);
                if(response?.success){
                        setShowToast({ key: true, type: "success", label: t("ROLE_UPDATED_SUCCESSFULLY") });
                    }
                    else{
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
            editor: true,
            viewer: false,
            creater: false
        });
    }

    const Node_Properties_Section = [
        [
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{stateData?.isNew ? heading[0].head : heading[1].head}</div>
            </div>,
            <div className="typography heading-m" style={{ color: "#0B4B66" }}>
                <div>{stateData?.isNew ? heading[0].desc : heading[1].desc}</div>
            </div>
        ],
        [
            <FieldV1
                error={stateData.name == "" ? t("PLEASE_ENTER_ROLE_NAME") : ""}
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
                value={stateData.desc}
            />,
            <AccessCard data={stateData} onChange={onDataChange} />,
            <Button
                variation="primary"
                label={t("CREATE_ROLE")}
                type="button"
                className="primary-button"
                style={{ width: "100%" }}
                onClick={(e) => createRole(e)}
            />,
            <Button
                variation="secondary"
                label={t("CANCEL")}
                type="button"
                className="secondary-button"
                style={{ width: "100%" }}
                onClick={(e) => cancel(e)}
            />
        ]
    ]

    if (moduleListLoading) {
        return <Loader />
    }
    return (
        <React.Fragment>
            {!selectedElement && <Card className="state-card" style={{ margin: "0px" }}>
                <div className="state-card-content">
                    <div className="state-icon">
                        {<CustomSVG.EditIcon height="30" width="30" />}
                    </div>
                    <div className="text-section">
                        <h3 className={`state-title`} style={{ margin: "6px" }} >{t("GETTING_STARTED")}</h3>
                        <p className={`state-description`} style={{ margin: "6px" }} >{t("GETTING_STARTED_DESC")}</p>
                    </div>
                </div>
            </Card>
            }
            <Card style={{ flex: 1, height: "100%", mixHeight: "800px", padding: "24px", justifyContent: "space-between" }} className="Workflow-card">
                <div>
                    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", padding: "24px" }}>
                        <RoleComp role={t("CREATE_ROLE")} desc={t("ADD_NEW")} isNew={true} onRoleClick={onClick} />
                        {roleCodes.map(role =>
                            <RoleComp role={t(role.code)} desc={t(role.description)} data={role} onRoleClick={onClick} />
                        )}
                    </div>
                </div>
                {selectedElement && <Card className="Workflow-card" style={{ justifyContent: "space-between" }}>
                    <SidePanel
                        type="static"
                        position="left"
                        isDraggable={true}
                        sections={Node_Properties_Section}
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
            </Card>
        </React.Fragment>
    );
};

export default Roles;