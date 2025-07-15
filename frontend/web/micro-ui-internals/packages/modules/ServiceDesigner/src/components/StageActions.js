import { useTranslation } from "react-i18next";
import { Card, FieldV1, Switch } from "@egovernments/digit-ui-components";
import React from "react";
import { LabelFieldPair } from "@egovernments/digit-ui-react-components";
import { HeaderComponent, Button } from "@egovernments/digit-ui-components";

const StageActions = ({ label, type, options }) => {
    const { t } = useTranslation();

    return (
        <Card style={{ width: "365px" }}>
            {type === "switch" ? (
                <Switch
                    isLabelFirst={true}
                    label={label}
                    shapeOnOff={true}
                    isCheckedInitially={false}
                    onToggle={(value) => console.log("Switch toggled:", value)}
                    className="stage-action-switch"
                    style={{ justifyContent: "space-between" }}
                />
            ) : type === "dropdown" ? (
                <FieldV1
                    label={label}
                    onChange={(e) => console.log("Dropdown value:", e)}
                    populators={{
                        name: "dropdownField",
                        fieldPairClassName: "workflow-field-pair",
                        alignFieldPairVerically: true,
                        optionsKey: "code",
                        options: options || [],
                    }}
                    props={{
                        fieldStyle: { width: "100%" }
                    }}
                    type="dropdown"
                    value={""}
                />
            ) : type === "button" ? (
                <LabelFieldPair removeMargin={true} style={{ justifyContent: "space-between" }}>
                    <HeaderComponent className={`label`}>
                        <div className={`label-container`}>
                            <label className={`label-styles`}>{label}</label>
                        </div>
                    </HeaderComponent>
                    <Button
                        type="button"
                        value={""}
                        name={label}
                        isDisabled={false}
                        label={t("CON")}
                        variation="primary"
                    />
                </LabelFieldPair>
            ) : null}
        </Card>
    );
};

export default StageActions;
