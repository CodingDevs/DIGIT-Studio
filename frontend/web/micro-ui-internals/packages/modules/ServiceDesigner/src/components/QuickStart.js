import React from "react";
import { useTranslation } from "react-i18next";
import { CustomSVG } from "@egovernments/digit-ui-components";

const QuickStart = ({ }) => {
    const { t } = useTranslation();

    const config = [
        {
            step: t("STEP_1"),
            desc : t("QUICK_START_STEP_1_DESC"),
        },
        {
            step: t("STEP_2"),
            desc : t("QUICK_START_STEP_2_DESC"),
        },
        {
            step: t("STEP_3"),
            desc : t("QUICK_START_STEP_3_DESC"),
        },
        {
            step: t("STEP_4"),
            desc : t("QUICK_START_STEP_4_DESC"),
        },
        {
            step: t("STEP_5"),
            desc : t("QUICK_START_STEP_5_DESC"),
        }
    ]

    return (
        <div className={`state-card`} style={{width: "270px", height: "300px"}}>
            <div className="state-card-content" style={{justifyContent: "center", flexDirection: "column"}}>
                <h3 className={`quickstart-title`}>{t("QUICK_START")}</h3>
                
                {config.map((item, index) => (
                    <div>
                        <div className="step-number">{item.step}</div>
                        <div className="step-description">{item.desc}</div>
                    </div>
                ))}
            </div>
        </div> 
    );
};

export default QuickStart;