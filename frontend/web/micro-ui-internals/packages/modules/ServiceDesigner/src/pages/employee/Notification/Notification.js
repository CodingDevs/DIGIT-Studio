import React, { useState, useEffect, useRef } from "react";
import { Toast } from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import { Card, Loader } from "@egovernments/digit-ui-react-components";
import { CardHeader, CardText } from "@egovernments/digit-ui-react-components";
import NotificationCard from "../../../components/NotificationCard";
import NotifCardConfig from "../../../config/NotifCardConfig";
import { Toggle } from "@egovernments/digit-ui-components";
import EmailPreFilledData from "../../../config/NotificationData";
import { SMSPreFilledData, PushPreFilledData } from "../../../config/NotificationData";
import { useHistory } from "react-router-dom";
import DataTable from "react-data-table-component";
import { tableCustomStyle } from "../../../utils/tableStyles";

const Notification = () => {
    const { t } = useTranslation();
    const history = useHistory();
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const searchParams = new URLSearchParams(location.search);
    const roleModule = searchParams.get("module") || "Studio";
    const roleService = searchParams.get("service") || "Service";
    const Category = `${roleModule.toUpperCase()}_${roleService.toUpperCase()}`;
    const [showToast, setShowToast] = useState(null);
    const [selectedToggle, setSelectedToggle] = useState("email");
    const [notificationData, setNotificationData] = useState([]);

    const requestCriteria = {
        url: "/egov-mdms-service/v2/_search",
        body: {
            MdmsCriteria: {
                tenantId: tenantId,
                schemaCode: "studio.notification"
            },
        },
    };
    const { isLoading, data: dataa } = Digit.Hooks.useCustomAPIHook(requestCriteria);
    const smsData = dataa?.mdms.filter(item => item.data?.additionalDetails?.type === "sms" && item.data?.additionalDetails?.category === Category);
    const emailData = dataa?.mdms.filter(item => item.data?.additionalDetails?.type === "email" && item.data?.additionalDetails?.category === Category);
    const pushData = dataa?.mdms.filter(item => item.data?.additionalDetails?.type === "push" && item.data?.additionalDetails?.category === Category);

    const toggleOptions = [
        { name: t("EMAIL"), code: "email" },
        { name: t("SMS"), code: "sms" },
        { name: t("PUSH"), code: "push" },
    ]

    // Format data for data table
    useEffect(() => {
        let currentData = [];
        if (selectedToggle === "email" && emailData) {
            currentData = emailData.map((item, index) => ({
                id: item.id || index,
                title: item.data?.title,
                messageBody: item.data?.messageBody,
                subject: item.data?.subject || "-",
                type: item.data?.additionalDetails?.type,
                createdDate: Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
                data: item.data
            }));
        } else if (selectedToggle === "sms" && smsData) {
            currentData = smsData.map((item, index) => ({
                id: item.id || index,
                title: item.data?.title,
                messageBody: item.data?.messageBody,
                subject: "-",
                type: item.data?.additionalDetails?.type,
                createdDate: Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
                data: item.data
            }));
        } else if (selectedToggle === "push" && pushData) {
            currentData = pushData.map((item, index) => ({
                id: item.id || index,
                title: item.data?.title,
                messageBody: item.data?.messageBody,
                subject: "-",
                type: item.data?.additionalDetails?.type,
                createdDate: Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
                data: item.data
            }));
        }
        setNotificationData(currentData);
    }, [selectedToggle, dataa]);

    // DataTable columns configuration
    const columns = [
        {
            name: t("STUDIO_SNO"),
            selector: (row, index) => index + 1,
            width: "80px",
            sortable: false,
        },
        {
            name: t("NOTIFICATION_TITLE"),
            selector: (row) => row.title,
            cell: (row) => (
                <div>
                    <div style={{ fontWeight: "400" }}>{row.title}</div>
                    <div style={{ fontSize: "12px", color: "#555" }}>
                        {row.messageBody}
                    </div>
                </div>
            ),
            sortable: true,
        },
        {
            name: t("STUDIO_CREATED_DATE"),
            selector: (row) => row.createdDate,
            sortable: true,
        },
        {
            name: t("STUDIO_CREATED_ACTIONS"),
            cell: (row) => (
                <button
                    style={{ color: "#c84c0e", fontSize: "14px", width: "4rem" }}
                    onClick={() => onExistingCardClick(row.type, row.data)}
                >
                    {t("STUDIO_EDIT")}
                </button>
            ),
            sortable: false,
        },
    ];

    const onCardClick = (e,data) => {
        history.push({
            pathname: `/${window.contextPath}/employee/servicedesigner/create-notification`,
            search: `?module=${roleModule}&service=${roleService}`,
            state: {
                type: e,
                data: e == "email" ? EmailPreFilledData : e == "sms" ? SMSPreFilledData : PushPreFilledData,
                isUpdate: false,
            },
        })
    }

    const onExistingCardClick = (e,data) => {
        history.push({
            pathname: `/${window.contextPath}/employee/servicedesigner/create-notification`,
            search: `?module=${roleModule}&service=${roleService}`,
            state: {
                type: e,
                data: data,
                isUpdate: true,
            },
        })
    }

    if (isLoading) {
        return <Loader />;
    }
    return (
        <React.Fragment>
            <CardHeader styles={{ fontSize: "xx-large", fontWeight: "bold", paddingTop: "24px", marginBottom: "0px" }}>{t("NOTIFICATION_HEADER")}</CardHeader>
            <CardText>{t("NOTIFICATION_HEADER_DESCRIPTION")}</CardText>
            <Card>
                <div style={{ display: "flex" }}>
                    {NotifCardConfig.map((item, index) => (
                        <NotificationCard title={item.title} desc={item.desc} index={item.key} onClick={onCardClick} data={null} />
                    ))}
                </div>
            </Card>
            <Card style={{paddingLeft:"2rem"}}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "2rem",
                        marginBottom: "1rem",
                        alignItems: "center",
                    }}
                >
                    <Toggle
                        name="toggleOptions"
                        numberOfToggleItems={3}
                        onSelect={(e) => setSelectedToggle(e)}
                        style={{ maxWidth: "23.5rem", marginTop: "10px" }}
                        options={toggleOptions}
                        optionsKey="name"
                        selectedOption={selectedToggle}
                        type="toggle"
                    />
                </div>

                {isLoading ? (
                    <div style={{ padding: "1rem" }}>Loading...</div>
                ) : notificationData.length > 0 ? (
                    <div style={{ marginTop: "1rem" }}>
                        <DataTable
                            columns={columns}
                            data={notificationData}
                            customStyles={tableCustomStyle}
                            pagination
                            paginationPerPage={10}
                            paginationRowsPerPageOptions={[5, 10, 20, 50]}
                            noDataComponent={<div style={{ padding: "1rem" }}>{t("NO_NOTIFICATIONS_MESSAGE")}</div>}
                            responsive
                            highlightOnHover
                            pointerOnHover
                        />
                    </div>
                ) : (
                    <div style={{ padding: "1rem" }}>{t("NO_NOTIFICATIONS_MESSAGE")}</div>
                )}
            </Card>
            {
                showToast && (
                    <Toast
                        type={showToast?.type}
                        label={t(showToast?.label)}
                        onClose={() => {
                            setShowToast(null);
                        }}
                        isDleteBtn={showToast?.isDleteBtn}
                        style={{ zIndex: 9999 }}
                    />
                )
            }
        </React.Fragment >
    );
};

export default Notification;