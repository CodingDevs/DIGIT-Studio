import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckBox } from "@egovernments/digit-ui-components";

const AccessCard = ({ onChange, data }) => {
    const { t } = useTranslation();
    
    return (
        <div className={`state-card`} style={{margin: "0px"}}>
            <div className="state-card-content" style={{ justifyContent: "center", flexDirection: "column", alignItems: "normal" }}>
                <h3 className={`quickstart-title`}>{t("ACCESS")}</h3>
                <CheckBox
                    onChange={(e) => onChange(["editor", e])}
                    value={data.editor}
                    checked={data.editor}
                    label={t("EDITOR")}
                    mainClassName={"access-checkbox"}
                />
                <CheckBox
                    onChange={(e) => onChange(["viewer", e])}
                    value={data.viewer}
                    checked={data.viewer}
                    label={t("VIEWER")}
                    mainClassName={"access-checkbox"}
                />
                <CheckBox
                    onChange={(e) => onChange(["creater", e])}
                    checked={data.creater}
                    value={data.creater}
                    label={t("CREATER")}
                    mainClassName={"access-checkbox"}
                />
            </div>
        </div>
    );
};

export default AccessCard;