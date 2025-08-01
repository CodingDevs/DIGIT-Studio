import React, { useState, useEffect } from "react";
import { Card, CardText, TextInput, SelectionTag, Dropdown, CardHeader, Button, FieldV1, Loader, CheckBox, Stepper, Divider } from "@egovernments/digit-ui-components";
import { DynamicImageComponent } from "./DynamicImageComponent";
import { CardSectionHeader, CardSectionSubText } from "@egovernments/digit-ui-react-components";
// import MobileBezelFrame from "./MobileBezelFrame";
// import GenericTemplateScreen from "./GenericTemplateScreen";
// import DynamicSVG from "./DynamicSVGComponent";
// import RenderSelectionField from "./RenderSelectionField";
// import { useCustomT } from "../pages/employee/formBuilder/useCustomT";

const MdmsDropdown = ({
  t,
  moduleMaster,
  optionKey = "code",
  moduleName,
  masterName,
  className,
  style = {},
  variant = "",
  selected,
  select = () => {},
  rest,
}) => {
  if (!moduleName || !masterName) return null;
  const { isLoading, data } = Digit.Hooks.useCustomMDMS(
    Digit.ULBService.getCurrentTenantId(),
    moduleName,
    [{ name: masterName }],
    {
      enabled: moduleName && masterName,
      select: (data) => {
        return data?.[moduleName]?.[masterName]?.filter((item) => item.active);
      },
    },
    { schemaCode: "MDMSDROPDOWNLIST" } //mdmsv2
  );

  if (isLoading) return <div>Loading...</div>;
  return (
    <Dropdown
      className={className}
      style={style}
      variant={variant}
      t={t}
      option={data}
      optionKey={optionKey}
      selected={selected}
      select={() => select()}
    />
  );
};

const renderField = (field, t) => {
  switch (field.type) {
    case "text":
    case "textInput":
      return <TextInput name="name" value={field?.name || ""} onChange={() => {}} disabled={true} />;
    case "number":
      return <TextInput type="number" className="appConfigLabelField-Input" name={""} value={field?.value} onChange={() => {}} />;
    case "textarea":
      return <TextInput type="textarea" className="appConfigLabelField-Input" name={""} value={field?.value} onChange={() => {}} />;
    case "time":
      return <TextInput type="time" className="appConfigLabelField-Input" name={""} value={field?.value} onChange={() => {}} />;
    case "mobileNumber":
      return (
        <TextInput
          type="text"
          className="appConfigLabelField-Input"
          name={""}
          value={field?.value}
          onChange={(event) => onChange(event)}
          populators={{ prefix: rest?.countryPrefix }}
        />
      );
    case "numeric":
    case "counter":
      return <TextInput name="numeric" onChange={() => {}} type={"numeric"} />;
    case "dropdown":
      return (
        <Dropdown
          option={field?.dropDownOptions || []}
          optionKey={"name"}
          selected={[]}
          select={() => {}}
          t={t}
        />
      );
    case "MdmsDropdown":
      return (
        <MdmsDropdown
          className="appConfigLabelField-Input"
          variant={""}
          t={t}
          option={dropDownOptions}
          optionKey={"code"}
          selected={null}
          select={() => {}}
          props={props}
          moduleName={rest?.schemaCode ? rest.schemaCode.split(".")[0] : rest?.moduleMaster?.moduleName}
          masterName={rest?.schemaCode ? rest.schemaCode.split(".")[1] : rest?.moduleMaster?.masterName}
          rest={rest}
        />
      );
    case "date":
    case "dobPicker":
    case "datePicker":
    case "dob":
      return <TextInput type="date" className="appConfigLabelField-Input" name={""} value={field?.value} onChange={() => {}} />;
    case "button":
      return (
        <Button
          icon={"QrCodeScanner"}
          className="app-preview-field-button"
          variation="secondary"
          label={t(field?.label)}
          title={t(field?.label)}
          onClick={() => {}}
        />
      );
    case "custom":
      return <DynamicImageComponent type={field?.type} appType={field?.appType} />;
    default:
      return <DynamicImageComponent type={field?.type} appType={field?.appType} />;
  }
};

const getFieldType = (field) => {
  switch (field.type) {
    case "text":
    case "textInput":
      return "text";
    case "number":
      return "number";
    case "textarea":
      return "textarea";
    case "time":
      return "time";
    case "mobileNumber":
      return "mobileNumber";
    case "checkbox":
      return "checkbox";
    case "Selection":
    case "selection":
    case "select":
      return "select";
    case "numeric":
    case "counter":
      return "numeric";
    case "dropdown":
      return "dropdown";
    case "MdmsDropdown":
      return "custom";
    case "date":
    case "dobPicker":
    case "datePicker":
    case "dob":
      return "date";
    case "radio":
      return "radio";
    default:
      return "button";
  }
};

const AppPreview = ({ data = {}, selectedField, t, onSectionChange, selectedSection = 0 }) => {
  const [currentStep, setCurrentStep] = useState(selectedSection);
  const cards = data.cards || [];
  const totalSteps = cards.length;

  // Sync currentStep with selectedSection prop
  useEffect(() => {
    setCurrentStep(selectedSection);
  }, [selectedSection]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      if (onSectionChange) onSectionChange(newStep);
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      if (onSectionChange) onSectionChange(newStep);
    }
  };

  if (!cards.length) return <div style={{ padding: 32, textAlign: 'center' }}>No sections to preview.</div>;

  const card = cards[currentStep];

  return (
    <React.Fragment>
    <div style={{ width: "81.5rem", margin: '32px auto', background: '#fafbfc', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', padding: 32 }}>
      <Stepper
        currentStep={currentStep + 1}
        totalSteps={cards.length}
        customSteps={cards.reduce((acc, c, idx) => {
          acc[idx] = c?.headerFields?.find(h => h.label === 'SCREEN_HEADING')?.value || `Section ${idx + 1}`;
          return acc;
        }, {})}
        onStepClick={(idx) => {
          setCurrentStep(idx);
          if (onSectionChange) onSectionChange(idx);
        }}
        style={{ marginBottom: 32 }}
      />
      <Card style={{width: "66rem", background: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: 24 }}>
        {card?.headerFields.map((headerField, headerIndex) => (
          <div key={headerIndex} style={{ marginBottom: headerField.jsonPath === 'ScreenHeading' ? 8 : 16 }}>
            {headerField.jsonPath === "ScreenHeading" ? (
              <CardSectionHeader>
                {headerField.value}
              </CardSectionHeader>
            ) : (
             <CardSectionSubText>{headerField.value}</CardSectionSubText>
            )}
          </div>
        ))}
        {data.type !== "template" &&
          card?.fields
            ?.filter((field) => field.active && (field.hidden == false || field.deleteFlag == true))
            ?.map((field, fieldIndex) => {
              if (getFieldType(field) === "checkbox") {
                return (
                  <div
                    className={`app-preview-field-pair ${
                      selectedField?.jsonPath && selectedField?.jsonPath === field?.jsonPath
                        ? `app-preview-selected`
                        : selectedField?.id && selectedField?.id === field?.id
                        ? `app-preview-selected`
                        : ``
                    }`}
                    key={fieldIndex}
                  >
                    <CheckBox
                      mainClassName={"app-config-checkbox-main"}
                      labelClassName={`app-config-checkbox-label ${field?.["toArray.required"] ? "required" : ""}`}
                      onChange={(e) => {}}
                      value={""}
                      label={field.label}
                      isLabelFirst={false}
                      disabled={field?.readOnly || false}
                    />
                  </div>
                );
              }
              return (
                <FieldV1
                  key={fieldIndex}
                  charCount={field?.charCount}
                  config={{
                    step: "",
                  }}
                  description={field?.isMdms ? t(field?.helpText) : field?.helpText || null}
                  error={field?.isMdms ? t(field?.errorMessage) : field?.errorMessage || null}
                  infoMessage={field?.isMdms ? t(field?.tooltip) : field?.tooltip || null}
                  label={
                    getFieldType(field) === "checkbox" || getFieldType(field) === "button"
                      ? null
                      : field?.isMdms
                      ? t(field?.label)
                      : field.label
                  }
                  onChange={function noRefCheck() {}}
                  placeholder={t(field?.innerLabel) || ""}
                  populators={{
                    t: field?.isMdms ? null : t,
                    title: field?.label,
                    fieldPairClassName: `app-preview-field-pair ${
                      selectedField?.jsonPath && selectedField?.jsonPath === field?.jsonPath
                        ? `app-preview-selected`
                        : selectedField?.id && selectedField?.id === field?.id
                        ? `app-preview-selected`
                        : ``
                    }`,
                    mdmsConfig: field?.isMdms
                      ? {
                          moduleName: field?.schemaCode?.split(".")[0],
                          masterName: field?.schemaCode?.split(".")[1],
                        }
                      : null,
                    options: field?.isMdms ? null : field?.dropDownOptions,
                    optionsKey: field?.isMdms ? "code" : "name",
                    component: getFieldType(field) === "button" || getFieldType(field) === "select" ? renderField(field, t) : null,
                  }}
                  required={field?.["toArray.required"] || false}
                  type={getFieldType(field) === "button" || getFieldType(field) === "select" ? "custom" : getFieldType(field) || "text"}
                  value={field?.value === true ? "" : field?.value || ""}
                  disabled={field?.readOnly || false}
                />
              );
            })}
        {/* {data.type !== "template" && (
          <Button
            className="app-preview-action-button"
            variation="primary"
            label={data?.actionLabel}
            title={data?.actionLabel}
            onClick={() => {}}
            style={{ marginTop: 24, width: '100%' }}
          />
        )} */}
      </Card>
    </div>
     {/* Section Navigation - Outside Preview */}
     <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '1.5rem', 
        marginTop: '2rem',
        padding: '1.5rem 0'
      }}>
        <Button
          variation="secondary"
          label={currentStep > 0 ? cards[currentStep - 1]?.headerFields?.find(h => h.label === 'SCREEN_HEADING')?.value || `Section ${currentStep}` : "Previous"}
          onClick={handleBack}
          disabled={currentStep === 0}
          style={{
            borderRadius: '2rem',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            minWidth: '120px'
          }}
        />
        
        {/* Section Indicator */}
          <span className="typography heading-s">
            {cards[currentStep]?.headerFields?.find(h => h.label === 'SCREEN_HEADING')?.value || `Section ${currentStep + 1}`}
          </span>
        
        <Button
          variation="secondary"
          label={currentStep < totalSteps - 1 ? cards[currentStep + 1]?.headerFields?.find(h => h.label === 'SCREEN_HEADING')?.value || `Section ${currentStep + 2}` : "Next"}
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1}
          style={{
            borderRadius: '2rem',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            minWidth: '120px'
          }}
        />
      </div>
    </React.Fragment>
  );
};

export default AppPreview;
