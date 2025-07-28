import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppConfigContext } from "./AppConfigurationWrapper";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardHeader,
  Divider,
  Stepper,
  Tab,
  ActionBar,
  LabelFieldPair,
  TextInput,
  Tooltip,
  TooltipWrapper,
  Switch,
} from "@egovernments/digit-ui-components";
import AppFieldComposer from "./AppFieldComposer";
import _ from "lodash";
import { useCustomT } from "./useCustomT";
import DraggableField from "./DraggableField";
import { useAppLocalisationContext } from "./AppLocalisationWrapper";
import { InfoOutline } from "@egovernments/digit-ui-svg-components";
import { DustbinIcon } from "@egovernments/digit-ui-react-components";
import ConsoleTooltip from "../../../components/ConsoleToolTip";
import { useBoundaryData } from "../../../hooks/useBoundaryData";

function AppFieldScreenWrapper() {
  const { 
    state, 
    dispatch, 
    openAddFieldPopup,
    currentFormName,
    setCurrentFormName,
    currentFormDescription,
    setCurrentFormDescription,
    selectedPreviewSection,
    setSelectedPreviewSection
  } = useAppConfigContext();
  const { locState, updateLocalization } = useAppLocalisationContext();
  const searchParams = new URLSearchParams(location.search);
  const projectType = searchParams.get("prefix");
  const formId = searchParams.get("formId");
  const { t } = useTranslation();
  
  // Fetch boundary data for city dropdown
  const { data: boundaryData, isLoading: isLoadingBoundary } = useBoundaryData();

  const currentCard = useMemo(() => {
    return state?.screenData?.[0];
  }, [
    state?.screenData,
    // , numberTabs, stepper, currentStep
  ]);

  // Ensure selectedPreviewSection is always valid
  useEffect(() => {
    if (currentCard?.cards && selectedPreviewSection >= currentCard.cards.length) {
      setSelectedPreviewSection(Math.max(0, currentCard.cards.length - 1));
    }
  }, [currentCard?.cards, selectedPreviewSection]);

  const moveField = useCallback(
    (field, targetedField, fromIndex, toIndex, currentCard, cardIndex) => {
      dispatch({
        type: "REORDER_FIELDS",
        payload: { field, targetedField, fromIndex, toIndex, currentCard, cardIndex },
      });
    },
    [dispatch, currentCard]
  );
  
  return (
    <React.Fragment>
      {/* Form Name and Description Section */}
      <div style={{ marginBottom: 24, padding: 16, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e9ecef" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: "#495057" }}>{t("FORM_NAME")}</span>
            <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_FORM_NAME")}/>
          </div>
          <TextInput
            name="formName"
            value={currentFormName}
            placeholder="Enter form name (e.g., Property Registration Form)"
            onChange={(event) => {
              setCurrentFormName(event.target.value);
              // Update URL parameter
              const newUrl = new URL(window.location);
              newUrl.searchParams.set("formName", event.target.value);
              window.history.replaceState({}, "", newUrl);
            }}
            style={{ marginBottom: 12 }}
          />
        </div>
        
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: "#495057" }}>{t("FORM_DESCRIPTION")}</span>
            <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_FORM_DESCRIPTION")}/>
          </div>
          <TextInput
            name="formDescription"
            value={currentFormDescription}
            placeholder="Enter form description (e.g., Form for registering property details)"
            onChange={(event) => {
              setCurrentFormDescription(event.target.value);
            }}
          />
        </div>
      </div>
      

      
      {!currentCard?.cards || currentCard.cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#6c757d" }}>
          No sections available. Add a section to get started.
        </div>
      ) : (
        currentCard?.cards?.map((cardObj, index) => {
        const { fields, headerFields } = cardObj;
        // Find heading and description fields
        const headingField = headerFields?.find((f) => f.label === "SCREEN_HEADING");
        const descriptionField = headerFields?.find((f) => f.label === "SCREEN_DESCRIPTION");
        
        // Only show the selected section
        if (selectedPreviewSection !== index) {
          return null;
        }
        
        // Ensure we have a valid section to show
        if (!cardObj) {
          return null;
        }
        
        // Hide auto-generated sections (Applicant Details and Address Details) from side panel
        const isApplicantSection = cardObj.fields?.some(field => field.jsonPath === "ApplicantName");
        const isAddressSection = cardObj.fields?.some(field => field.jsonPath === "AddressPincode");
        
        if (isApplicantSection || isAddressSection) {
          return null;
        }
        
        // Count custom sections (excluding auto-generated ones)
        const customSections = currentCard?.cards?.filter(card => {
          const isApplicant = card.fields?.some(field => field.jsonPath === "ApplicantName");
          const isAddress = card.fields?.some(field => field.jsonPath === "AddressPincode");
          return !isApplicant && !isAddress;
        });
        const customSectionsCount = customSections?.length || 0;
        
        return (
          <div key={index} className="app-config-section-block" style={{ border: "1px solid #eee", borderRadius: 8, marginBottom: 16, padding: 16, position: 'relative' }}>
            {/* Dustbin icon in top right corner - only show when more than 1 custom section */}
            {customSectionsCount > 1 && (
              <button
                style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: 4,
                  zIndex: 10
                }}
                title={t('DELETE_SECTION')}
                onClick={() => {
                  dispatch({
                    type: 'DELETE_SECTION',
                    payload: {
                      currentScreen: currentCard,
                      sectionIndex: index,
                    },
                  });
                }}
              >
                <DustbinIcon width={20} height={20} fill="#d32f2f" />
              </button>
            )}
            
            <div className="app-config-section-header" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 100 }}>{t("SECTION_HEADING")}</span>
                  <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_SECTION_HEADING")}/>
                </div>
                <TextInput
                  name="sectionHeading"
                  value={typeof headingField?.value === 'string' ? headingField.value : `Section ${index + 1}`}
                  placeholder={t("Enter section heading")}
                  onChange={(event) => {
                    dispatch({
                      type: "UPDATE_HEADER_FIELD",
                      payload: {
                        currentField: cardObj,
                        currentScreen: currentCard,
                        field: headingField,
                        value: event.target.value,
                      },
                    });
                  }}
                  style={{ marginTop: 4, marginBottom: 8 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontWeight: 100 }}>{t("SECTION_DESCRIPTION")}</span>
                  <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_SECTION_DESCRIPTION")}/>
                </div>
                <TextInput
                  name="sectionDescription"
                  value={typeof descriptionField?.value === 'string' ? descriptionField.value : `Description for Section ${index + 1}`}
                  placeholder={t("Enter section description")}
                  onChange={(event) => {
                    dispatch({
                      type: "UPDATE_HEADER_FIELD",
                      payload: {
                        currentField: cardObj,
                        currentScreen: currentCard,
                        field: descriptionField,
                        value: event.target.value,
                      },
                    });
                  }}
                  style={{ marginTop: 4, marginBottom: 12 }}
                />
              </div>
            </div>
            <div className="app-config-drawer-subheader" style={{ marginTop: 12 }}>
              <div>{t("APPCONFIG_SUBHEAD_FIELDS")}</div>
              <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_APPCONFIG_SUBHEAD_FIELDS")} />
            </div>
            {fields?.map((field, i, c) => (
              <DraggableField
                key={field.jsonPath || i}
                type={field.type}
                label={field.label}
                active={field.active}
                required={field.required}
                isDelete={field.deleteFlag === false ? false : true}
                dropDownOptions={field.dropDownOptions}
                onDelete={() => {
                  dispatch({
                    type: "DELETE_FIELD",
                    payload: {
                      currentScreen: currentCard,
                      currentCard: cardObj,
                      currentField: c[i],
                    },
                  });
                }}
                onHide={() => {
                  dispatch({
                    type: "HIDE_FIELD",
                    payload: {
                      currentScreen: currentCard,
                      currentCard: cardObj,
                      currentField: c[i],
                    },
                  });
                }}
                onSelectField={() => {
                  dispatch({
                    type: "SELECT_DRAWER_FIELD",
                    payload: {
                      currentScreen: currentCard,
                      currentCard: cardObj,
                      drawerField: c[i],
                    },
                  });
                }}
                config={c[i]}
                Mandatory={field.Mandatory}
                helpText={useCustomT(field.helpText)}
                infoText={useCustomT(field.infoText)}
                innerLabel={useCustomT(field.innerLabel)}
                rest={field.rest}
                index={i}
                fieldIndex={i}
                cardIndex={cardObj}
                indexOfCard={index}
                moveField={moveField}
                fields={c}
              />
            ))}
            {currentCard?.type !== "template" && currentCard?.config?.enableFieldAddition && (
              <Button
                className={"app-config-drawer-button"}
                type={"button"}
                size={"medium"}
                icon={"AddIcon"}
                variation={"teritiary"}
                label={t("ADD_FIELD")}
                style={{ marginTop: 12 }}
                onClick={() => {
                  openAddFieldPopup({
                    currentScreen: currentCard,
                    currentCard: cardObj,
                  });
                  return;
                }}
              />
            )}
          </div>
        );
      })
      )}
      <Button
        className={"app-config-add-section"}
        type={"button"}
        size={"large"}
        variation={"secondary"}
        label={t("ADD_SECTION")}
        onClick={() => {
          const newSectionIndex = currentCard?.cards?.length || 0;
          dispatch({
            type: "ADD_SECTION",
            payload: {
              currentScreen: currentCard,
            },
          });
          // Auto-switch to the new section
          setSelectedPreviewSection(newSectionIndex);
          return;
        }}
        style={{ marginTop: 8, marginBottom: 8 }}
      />
      
      {/* <Divider style={{ margin: "24px 0" }} /> */}
      
      {/* Toggle Cards */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, color: "#495057", fontSize: "1.1rem" }}>Section Options</h3>
        
        {/* Applicant Details Toggle */}
        <Card style={{ marginBottom: 16, padding: 16, border: "1px solid #e9ecef" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h4 style={{ margin: 0, color: "#0B4B66" }}>Applicant Details</h4>
              <ConsoleTooltip className="app-config-tooltip" toolTipContent="Add personal information fields (Name, Mobile, Gender)"/>
            </div>
            <Switch
              isCheckedInitially={state?.applicantDetailsEnabled || currentCard?.cards?.some(card => 
                card?.fields?.some(field => field.jsonPath === "ApplicantName")
              ) || false}
              onToggle={(enabled) => {
                dispatch({
                  type: "TOGGLE_APPLICANT_DETAILS",
                  payload: {
                    enabled: enabled,
                    currentScreen: currentCard,
                  },
                });
                // Switch to the new section in preview if enabled
                if (enabled) {
                  const newSectionIndex = currentCard?.cards?.length || 0;
                  setSelectedPreviewSection(newSectionIndex);
                } else {
                  // When disabling, switch back to the first custom section
                  const customSections = currentCard?.cards?.filter((card, idx) => {
                    const isApplicantSection = card.fields?.some(field => field.jsonPath === "ApplicantName");
                    const isAddressSection = card.fields?.some(field => field.jsonPath === "AddressPincode");
                    return !isApplicantSection && !isAddressSection;
                  });
                  if (customSections && customSections.length > 0) {
                    const firstCustomSectionIndex = currentCard.cards.findIndex(card => 
                      card === customSections[0]
                    );
                    setSelectedPreviewSection(firstCustomSectionIndex);
                  }
                }
              }}
            />
          </div>
        </Card>
        
        {/* Address Details Toggle */}
        <Card style={{ marginBottom: 16, padding: 16, border: "1px solid #e9ecef" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h4 style={{ margin: 0, color: "#0B4B66" }}>Address Details</h4>
              <ConsoleTooltip className="app-config-tooltip" toolTipContent="Add address fields (Pincode, Street, City)"/>
            </div>
            <Switch
              isCheckedInitially={state?.addressDetailsEnabled || currentCard?.cards?.some(card => 
                card?.fields?.some(field => field.jsonPath === "AddressPincode")
              ) || false}
              onToggle={(enabled) => {
                dispatch({
                  type: "TOGGLE_ADDRESS_DETAILS",
                  payload: {
                    enabled: enabled,
                    currentScreen: currentCard,
                    boundaryData: boundaryData || [],
                  },
                });
                // Switch to the new section in preview if enabled
                if (enabled) {
                  const newSectionIndex = currentCard?.cards?.length || 0;
                  setSelectedPreviewSection(newSectionIndex);
                } else {
                  // When disabling, switch back to the first custom section
                  const customSections = currentCard?.cards?.filter((card, idx) => {
                    const isApplicantSection = card.fields?.some(field => field.jsonPath === "ApplicantName");
                    const isAddressSection = card.fields?.some(field => field.jsonPath === "AddressPincode");
                    return !isApplicantSection && !isAddressSection;
                  });
                  if (customSections && customSections.length > 0) {
                    const firstCustomSectionIndex = currentCard.cards.findIndex(card => 
                      card === customSections[0]
                    );
                    setSelectedPreviewSection(firstCustomSectionIndex);
                  }
                }
              }}
            />
          </div>
        </Card>
        
        {/* Documents Toggle */}
        <Card style={{ marginBottom: 16, padding: 16, border: "1px solid #e9ecef" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h4 style={{ margin: 0, color: "#0B4B66" }}>Documents</h4>
              <ConsoleTooltip className="app-config-tooltip" toolTipContent="Document upload functionality (Coming Soon)"/>
            </div>
            <Switch
              isCheckedInitially={false}
              disable={true}
            />
          </div>
        </Card>
      </div>
      {/* <Divider className="app-config-drawer-action-divider" /> */}
      {/* {currentCard?.type !== "template" && (
        <>
          <div className="app-config-drawer-subheader">
            <div>{t("APPCONFIG_SUBHEAD_BUTTONS")}</div>
            <ConsoleTooltip className="app-config-tooltip" toolTipContent={t("TIP_APPCONFIG_SUBHEAD_BUTTONS")} />
          </div>
          <LabelFieldPair className="app-preview-app-config-drawer-action-button">
            <div className="">
              <span>{`${t("APP_CONFIG_ACTION_BUTTON_LABEL")}`}</span>
            </div>
            <TextInput
              name="name"
              value={useCustomT(currentCard?.actionLabel)}
              onChange={(event) => {
                updateLocalization(
                  currentCard?.actionLabel && currentCard?.actionLabel !== true
                    ? currentCard?.actionLabel
                    : `${currentCard?.parent}_${currentCard?.name}_ACTION_BUTTON_LABEL`,
                  Digit?.SessionStorage.get("locale") || Digit?.SessionStorage.get("initData")?.selectedLanguage,
                  event.target.value
                );
                dispatch({
                  type: "ADD_ACTION_LABEL",
                  payload: {
                    currentScreen: currentCard,
                    actionLabel:
                      currentCard?.actionLabel && currentCard?.actionLabel !== true
                        ? currentCard?.actionLabel
                        : `${currentCard?.parent}_${currentCard?.name}_ACTION_BUTTON_LABEL`,
                  },
                });
                return;
              }}
            />
          </LabelFieldPair>
        </>
      )} */}
    </React.Fragment>
  );
}

export default React.memo(AppFieldScreenWrapper);
