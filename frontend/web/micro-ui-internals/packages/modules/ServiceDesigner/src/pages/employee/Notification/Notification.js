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
            <Card>
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
                <div style={{ display: "flex" }}>
                {selectedToggle === "email" && emailData.length > 0 &&
                    emailData.map((item, index) => (
                        <NotificationCard
                            key={index}
                            title={item.data.title}
                            desc={item.data.messageBody}
                            index={item.data.additionalDetails.type}
                            onClick={onExistingCardClick}
                            data={item.data}
                        />
                    ))
                }
                {selectedToggle === 'sms' && smsData.length > 0 &&
                    smsData.map((item, index) => (
                        <NotificationCard
                            key={index}
                            title={item.data.title}
                            desc={item.data.messageBody}
                            index={item.data.additionalDetails.type}
                            onClick={onExistingCardClick}
                            data={item.data}
                        />
                    ))
                }
                {selectedToggle === 'push' && pushData.length > 0 &&
                    pushData.map((item, index) => (
                        <NotificationCard
                            key={index}
                            title={item.data.title}
                            desc={item.data.messageBody}
                            index={item.data.additionalDetails.type}
                            onClick={onExistingCardClick}
                            data={item.data}
                        />
                    ))
                }
                {(selectedToggle === "email" && emailData.length === 0) ||
                    (selectedToggle === "sms" && smsData.length === 0) ||
                    (selectedToggle === "push" && pushData.length === 0) ? (
                    <div>
                        <CardText style={{ textAlign: "center" }}>{t("NO_NOTIFICATIONS_MESSAGE")}</CardText>
                    </div>
                ) : null}
                </div>
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