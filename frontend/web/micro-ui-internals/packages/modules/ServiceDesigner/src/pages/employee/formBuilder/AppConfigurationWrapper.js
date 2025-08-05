import React, { createContext, Fragment, useContext, useEffect, useReducer, useState } from "react";
import AppFieldScreenWrapper from "./AppFieldScreenWrapper";
import { Footer, Button, Loader, PopUp, SidePanel, Toast, FieldV1, Tag } from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import DrawerFieldComposer from "./DrawerFieldComposer";
import { useAppLocalisationContext } from "./AppLocalisationWrapper";
import AppLocalisationTable from "./AppLocalisationTable";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import AppPreview from "../../../components/AppPreview";
import { useCustomT } from "./useCustomT";
import useUpsertLocalisationParallel from "../../../hooks/useUpsertLocalisationParallel";
import { useFormConfigAPI, transformFormDataToMDMS } from "../../../hooks/useFormConfigAPI";
import { useHistory } from "react-router-dom";

const mdms_context_path = window?.globalConfigs?.getConfig("MDMS_V2_CONTEXT_PATH") || "mdms-v2";

const AppConfigContext = createContext();

const initialState = {};

export const useAppConfigContext = () => {
  return useContext(AppConfigContext);
};
const reorderConfig = (config, fromIndex, toIndex) => {
  if (
    fromIndex === toIndex || // No change needed
    fromIndex < 0 ||
    toIndex < 0 || // Prevent negative indexes
    fromIndex >= config?.length ||
    toIndex >= config?.length // Prevent out-of-bounds access
  ) {
    return [...config]; // Return a copy to ensure immutability
  }

  const updatedConfig = [...config]; // Copy array to avoid mutation
  const [movedItem] = updatedConfig.splice(fromIndex, 1); // Remove item
  updatedConfig.splice(toIndex, 0, movedItem); // Insert item at new index
  return updatedConfig?.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
};
const reducer = (state = initialState, action, updateLocalization) => {
  switch (action.type) {
    case "MASTER_DATA":
      return {
        ...state,
        MASTER_DATA: { ...action.state },
        screenConfig: action.state?.screenConfig,
        screenData: action.state?.screenConfig,
      };
    case "SET_SCREEN_DATA":
      return {
        ...state,
        screenConfig: action.state?.screenConfig,
        screenData: action.state?.screenConfig,
        drawerField: null,
      };
    case "ADD_SECTION":
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            const newSectionIndex = (item?.cards?.length || 0);
            return {
              ...item,
              cards: [
                ...item?.cards,
                {
                  fields: [],
                  header: "Header",
                  description: "Desc",
                  headerFields: [
                    {
                      type: "text",
                      label: "SCREEN_HEADING",
                      active: true,
                      jsonPath: "ScreenHeading",
                      metaData: {},
                      required: true,
                      value: `Section ${newSectionIndex + 1}`,
                    },
                    {
                      type: "text",
                      label: "SCREEN_DESCRIPTION",
                      active: true,
                      jsonPath: "Description",
                      metaData: {},
                      required: true,
                      value: `Description for Section ${newSectionIndex + 1}`,
                    },
                  ],
                },
              ],
            };
          }
          return item;
        }),
      };
    case "TOGGLE_APPLICANT_DETAILS":
      return {
        ...state,
        applicantDetailsEnabled: action.payload.enabled,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            const updatedCards = [...item.cards];
            
            if (action.payload.enabled) {
              // Add applicant details section if it doesn't exist
              const applicantSectionExists = updatedCards.some(card => 
                card.fields?.some(field => field.jsonPath === "ApplicantName")
              );
              
              if (!applicantSectionExists) {
                updatedCards.push({
                  fields: [
                    {
                      type: "text",
                      label: "Name",
                      active: true,
                      jsonPath: "ApplicantName",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                    },
                    {
                      type: "mobileNumber",
                      label: "Mobile Number",
                      active: true,
                      jsonPath: "ApplicantMobile",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                    },
                    {
                      type: "dropdown",
                      label: "Gender",
                      active: true,
                      jsonPath: "ApplicantGender",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                      dropDownOptions: [
                        { name: "Male", value: "male" },
                        { name: "Female", value: "female" },
                        { name: "Other", value: "other" }
                      ],
                    },
                  ],
                  header: "Applicant Details",
                  description: "Applicant Information",
                  headerFields: [
                    {
                      type: "text",
                      label: "SCREEN_HEADING",
                      active: true,
                      jsonPath: "ScreenHeading",
                      metaData: {},
                      required: true,
                      value: "Applicant Details",
                    },
                    {
                      type: "text",
                      label: "SCREEN_DESCRIPTION",
                      active: true,
                      jsonPath: "Description",
                      metaData: {},
                      required: true,
                      value: "Please provide your personal information",
                    },
                  ],
                });
              }
            } else {
              // Remove applicant details section
              const filteredCards = updatedCards.filter(card => 
                !card.fields?.some(field => field.jsonPath === "ApplicantName")
              );
              updatedCards.length = 0;
              updatedCards.push(...filteredCards);
            }
            
            return {
              ...item,
              cards: updatedCards,
            };
          }
          return item;
        }),
      };
    case "TOGGLE_ADDRESS_DETAILS":
      return {
        ...state,
        addressDetailsEnabled: action.payload.enabled,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            const updatedCards = [...item.cards];
            
            if (action.payload.enabled) {
              // Add address details section if it doesn't exist
              const addressSectionExists = updatedCards.some(card => 
                card.fields?.some(field => field.jsonPath === "AddressPincode")
              );
              
              if (!addressSectionExists) {
                updatedCards.push({
                  fields: [
                    {
                      type: "text",
                      label: "Pincode",
                      active: true,
                      jsonPath: "AddressPincode",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                    },
                    {
                      type: "text",
                      label: "Street Name",
                      active: true,
                      jsonPath: "AddressStreet",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                    },
                    {
                      type: "dropdown",
                      label: "City",
                      active: true,
                      jsonPath: "AddressCity",
                      metaData: {},
                      required: true,
                      value: "",
                      readOnly: false,
                      deleteFlag: true,
                      dropDownOptions: action.payload.boundaryData || [], // Populated from boundary API
                      isBoundaryData: true,
                    },
                  ],
                  header: "Address Details",
                  description: "Address Information",
                  headerFields: [
                    {
                      type: "text",
                      label: "SCREEN_HEADING",
                      active: true,
                      jsonPath: "ScreenHeading",
                      metaData: {},
                      required: true,
                      value: "Address Details",
                    },
                    {
                      type: "text",
                      label: "SCREEN_DESCRIPTION",
                      active: true,
                      jsonPath: "Description",
                      metaData: {},
                      required: true,
                      value: "Please provide your address information",
                    },
                  ],
                });
              }
            } else {
              // Remove address details section
              const filteredCards = updatedCards.filter(card => 
                !card.fields?.some(field => field.jsonPath === "AddressPincode")
              );
              updatedCards.length = 0;
              updatedCards.push(...filteredCards);
            }
            
            return {
              ...item,
              cards: updatedCards,
            };
          }
          return item;
        }),
      };
    case "ADD_ACTION_LABEL":
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              actionLabel: action.payload.actionLabel,
            };
          }
          return item;
        }),
      };

    case "ADD_FIELD":
      return {
        ...state,
        isPopup: true,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              cards: item?.cards?.map((j, k, c) => {
                if (j.header === action.payload.currentCard?.header) {
                  const regex = new RegExp(`^${item?.name}_${j?.header}_newField(\\d+)$`);
                  const maxCounter = j.fields
                    .map((f) => {
                      const match = f.jsonPath && f.jsonPath.match(regex);
                      return match ? parseInt(match[1], 10) : 0;
                    })
                    .reduce((max, curr) => Math.max(max, curr), 0);
                  const nextCounter = maxCounter + 1;
                  return {
                    ...j,
                    fields: [
                      ...j.fields,
                      {
                        ...action?.payload?.fieldData,
                        jsonPath: `${item?.name}_${j?.header}_newField${nextCounter}`,
                        type: action.payload.fieldData?.type?.fieldType,
                        appType: action.payload.fieldData?.type?.type,
                        label: action.payload.fieldData?.label, // Store value directly
                        active: true,
                        deleteFlag: true,
                      },
                    ],
                  };
                }
                return j;
              }),
            };
          }
          return item;
        }),
      };
    case "HIDE_FIELD": //added logic to hide fields in display
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              cards: item?.cards?.map((j, k) => {
                if (j.header === action.payload.currentCard?.header) {
                  return {
                    ...j,
                    fields: j.fields?.map((k) => (k.jsonPath === action.payload.currentField.jsonPath ? { ...k, hidden: !k.hidden } : { ...k })),
                  };
                }
                return j;
              }),
            };
          }
          return item;
        }),
      };
    case "DELETE_FIELD":
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              cards: item?.cards?.map((j, k) => {
                if (j.header === action.payload.currentCard?.header) {
                  return {
                    ...j,
                    fields: j.fields?.filter((k) => k.jsonPath !== action.payload.currentField.jsonPath),
                  };
                }
                return j;
              }),
            };
          }
          return item;
        }),
      };
    case "UPDATE_HEADER_FIELD":
      // updateLocalization(
      //   action?.payload?.localisedCode,
      //   Digit?.SessionStorage.get("locale") || Digit?.SessionStorage.get("initData")?.selectedLanguage,
      //   action?.payload?.value
      // );
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              cards: item?.cards?.map((j, k) => {
                if (j.header === action.payload.currentField?.header) {
                  return {
                    ...j,
                    headerFields: j.headerFields?.map((m, n) => {
                      if (m.label === action?.payload?.field?.label) {
                        return {
                          ...m,
                          value: action?.payload?.value, // Store value directly
                        };
                      }
                      return m;
                    }),
                  };
                }
                return j;
              }),
            };
          }
          return item;
        }),
      };
    case "SELECT_DRAWER_FIELD":
      return {
        ...state,
        currentScreen: action?.payload?.currentScreen,
        currentCard: action?.payload?.currentCard,
        drawerField: action?.payload?.drawerField,
      };
    case "UNSELECT_DRAWER_FIELD":
      return {
        ...state,
        drawerField: null,
      };
    case "UPDATE_DRAWER_FIELD":
      return {
        ...state,
        screenData: state?.screenData?.map((item, index) => {
          if (item?.name === state?.currentScreen?.name) {
            return {
              ...item,
              cards: item?.cards?.map((j, k) => {
                if (j.header === state.currentCard?.header) {
                  return {
                    ...j,
                    fields: j.fields.map((k) => {
                      if (k.id ? k.id === state?.drawerField?.id : k.jsonPath === state?.drawerField?.jsonPath) {
                        return {
                          ...action.payload.updatedState,
                        };
                      }
                      return k;
                    }),
                  };
                }
                return j;
              }),
            };
          }
          return item;
        }),
      };
    case "REORDER_FIELDS":
      return {
        ...state,
        screenData: [
          {
            ...state?.screenData[0],
            cards: state?.screenData[0]?.cards.map((card, index) => {
              if (index === action.payload.cardIndex) {
                return {
                  ...card,
                  fields: reorderConfig(card.fields, action.payload.fromIndex, action.payload.toIndex),
                };
              }
              return card;
            }),
          },
        ],
      };
    case "DELETE_SECTION":
      return {
        ...state,
        screenData: state?.screenData?.map((item, idx) => {
          if (item?.name === action?.payload?.currentScreen?.name) {
            return {
              ...item,
              cards: item.cards.filter((_, i) => i !== action.payload.sectionIndex),
            };
          }
          return item;
        }),
      };
    default:
      return state;
  }
};

const MODULE_CONSTANTS = "Studio";

function AppConfigurationWrapper({ screenConfig, localeModule, pageTag, formName, formDescription, onFormNameChange, onFormDescriptionChange }) {
  const { locState, addMissingKey, updateLocalization, onSubmit, back, showBack, parentDispatch } = useAppLocalisationContext();
  const [state, dispatch] = useReducer((state, action) => reducer(state, action, updateLocalization), initialState);
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const history = useHistory();
  const { t } = useTranslation();
  const currentLocale = Digit?.SessionStorage.get("locale") || Digit?.SessionStorage.get("initData")?.selectedLanguage;
  const [showPopUp, setShowPopUp] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [addFieldData, setAddFieldData] = useState(null);
  const searchParams = new URLSearchParams(location.search);
  const fieldMasterName = searchParams.get("fieldType");
  const [selectedPreviewSection, setSelectedPreviewSection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(null);
  const { mutateAsync: localisationMutate } = useUpsertLocalisationParallel(tenantId, localeModule, currentLocale);
  const [showToast, setShowToast] = useState(null);
  const [nextButtonDisable, setNextButtonDisable] = useState(null);
  const enabledModules = Digit?.SessionStorage.get("initData")?.languages || [];
  const [validationErrors, setValidationErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Form configuration API hook
  const { saveFormConfig, updateFormConfig, fetchFormConfigByName } = useFormConfigAPI();
  
  // Get module and service from URL parameters
  const module = searchParams.get("module");
  const service = searchParams.get("service");
  const editMode = searchParams.get("editMode") === "true"; // Check for edit mode

  // State for form name and description (will be updated from side panel)
  const [currentFormName, setCurrentFormName] = useState(formName || "");
  const [currentFormDescription, setCurrentFormDescription] = useState(formDescription || "");
  const [showFormNamePopup, setShowFormNamePopup] = useState(!currentFormName && !editMode); // Show popup if no form name and not in edit mode
  const [showSectionPopup, setShowSectionPopup] = useState(false);

  // Fetch existing form data if in edit mode (using formName as unique identifier)
  const { data: existingFormData, isLoading: isLoadingExistingForm } = fetchFormConfigByName(formName);
  const { isLoading: isLoadingAppConfigMdmsData, data: AppConfigMdmsData } = Digit.Hooks.useCustomMDMS(
    Digit.ULBService.getCurrentTenantId(),
    MODULE_CONSTANTS,
    [
      { name: fieldMasterName, limit: 100 },
      { name: "FieldPropertiesPanelConfig", limit: 100 },
      { name: "DETAILS_RENDERER_CONFIG", limit: 100 },
    ],
    {
      cacheTime: Infinity,
      staleTime: Infinity,
      select: (data) => {
        dispatch({
          type: "MASTER_DATA",
          state: {
            screenConfig: screenConfig,
            ...data?.["Studio"],
            DrawerPanelConfig: data?.["Studio"]?.["FieldPropertiesPanelConfig"],
            AppFieldType: data?.["Studio"]?.[fieldMasterName],
            DetailsConfig: data?.["Studio"]?.["DETAILS_RENDERER_CONFIG"],
            // ...dummyMaster,
          },
        });
      },
    },
    { schemaCode: "BASE_APP_MASTER_DATA" } //mdmsv2
  );

  const openAddFieldPopup = (data) => {
    setPopupData({ ...data, id: crypto.randomUUID() });
  };
  const fetchLoc = (key) => {
    return locState?.find((i) => i.code === key)?.[currentLocale];
  };

  // Function to check for duplicate form names
  const checkDuplicateFormName = async (formName) => {
    if (!formName) return false;
    
    try {
      const payload = {
        MdmsCriteria: {
          tenantId: tenantId,
          schemaCode: "Studio.Forms",
          isActive: true,
          filters: {
            // module: module,
            // service: service,
            "formName": formName.trim(),
          },
        },
      };

      const response = await Digit.CustomService.getResponse({
        url: `/${mdms_context_path}/v2/_search`,
        params: { tenantId: tenantId },
        body: payload,
      });

      const existingForms = response?.mdms || [];
      
      // In edit mode, exclude the current form from duplicate check
      if (editMode && existingFormData) {
        return existingForms.some(form => 
          form.id !== existingFormData.id && 
          form.data?.formName === formName.trim()
        );
      }
      
      // In create mode, check if any form with same name exists
      return existingForms.length > 0;
    } catch (error) {
      console.error("Error checking duplicate form name:", error);
      return false; // Return false to allow form creation if check fails
    }
  };



  // Validation function for form builder
  const validateForm = async () => {
    const errors = {};

    // 1. Verify if form name not entered
    if (!currentFormName || !currentFormName.trim()) {
      errors.formName = t("FORM_NAME_REQUIRED");
    } else {
      // 2. Check for duplicate form name (only if form name is provided)
      const isDuplicate = await checkDuplicateFormName(currentFormName);
      if (isDuplicate) {
        errors.duplicateFormName = t("FORM_NAME_ALREADY_EXISTS");
      }
    }

    // 3. Verify field added but no type selected
    const fields = state?.screenData?.[0]?.cards?.[0]?.fields || [];
    const fieldsWithoutType = fields.filter(field => !field.type);
    if (fieldsWithoutType.length > 0) {
      errors.fieldType = t("FIELD_TYPE_REQUIRED");
    }

    // 4. Verify if two fields with same name
    const fieldNames = fields.map(field => field.label).filter(Boolean);
    const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.duplicateNames = t("DUPLICATE_FIELD_NAMES");
    }

    // 5. Check for required metadata missing
    const fieldsWithMissingMetadata = fields.filter(field => {
      if (!field.label || !field.type) return true;
      return false;
    });
    if (fieldsWithMissingMetadata.length > 0) {
      errors.missingMetadata = t("MISSING_REQUIRED_INFORMATION");
    }

    return errors;
  };

  // Function to check for unsaved changes
  const checkForUnsavedChanges = () => {
    // This is a simplified check - you might want to implement more sophisticated change tracking
    return hasUnsavedChanges;
  };

  // Function to handle window beforeunload event
  const handleBeforeUnload = (e) => {
    if (checkForUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = t("STUDIO_UNSAVED_CHANGES_WARNING");
      return t("STUDIO_UNSAVED_CHANGES_WARNING");
    }
  };

  // Add event listener for window beforeunload
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Add event listener for opening form name popup
  useEffect(() => {
    const handleOpenFormNamePopup = () => {
      setShowFormNamePopup(true);
    };

    window.addEventListener('openFormNamePopup', handleOpenFormNamePopup);
    return () => {
      window.removeEventListener('openFormNamePopup', handleOpenFormNamePopup);
    };
  }, []);

  // Track changes to mark unsaved changes
  useEffect(() => {
    if (state?.screenData) {
      setHasUnsavedChanges(true);
    }
  }, [state?.screenData]);

  // Clear unsaved changes when form is successfully saved
  const clearUnsavedChanges = () => {
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    const handleStepChange = (e) => {
      setNextButtonDisable(e.detail);
    };

    window.addEventListener("lastButtonDisabled", handleStepChange);

    return () => {
      window.removeEventListener("lastButtonDisabled", handleStepChange);
    };
  }, []);

  useEffect(() => {
    dispatch({
      type: "SET_SCREEN_DATA",
      state: {
        screenConfig: screenConfig,
      },
    });
  }, [screenConfig]);

  // Load existing form data when in edit mode
  useEffect(() => {
    if (editMode && existingFormData && !isLoadingExistingForm) {
      
      // Set form name and description from existing data
      const existingFormName = existingFormData?.data?.formName || formName;
      const existingFormDescription = existingFormData?.data?.formDescription || formDescription;
      
      setCurrentFormName(existingFormName);
      setCurrentFormDescription(existingFormDescription);
      
      // Transform MDMS data back to form builder format
      const formConfig = existingFormData?.data?.formConfig;
      if (formConfig?.screens) {
        dispatch({
          type: "SET_SCREEN_DATA",
          state: {
            screenConfig: formConfig.screens,
          },
        });
        
        // Check for existing applicant and address sections to set toggle states
        const hasApplicantSection = formConfig.screens?.some(screen => 
          screen?.cards?.some(card => 
            card?.fields?.some(field => field.jsonPath === "ApplicantName")
          )
        );
        
        const hasAddressSection = formConfig.screens?.some(screen => 
          screen?.cards?.some(card => 
            card?.fields?.some(field => field.jsonPath === "AddressPincode")
          )
        );
        
        if (hasApplicantSection) {
          dispatch({
            type: "TOGGLE_APPLICANT_DETAILS",
            payload: {
              enabled: true,
              currentScreen: formConfig.screens[0], // Assuming first screen
            },
          });
        }
        
        if (hasAddressSection) {
          dispatch({
            type: "TOGGLE_ADDRESS_DETAILS",
            payload: {
              enabled: true,
              currentScreen: formConfig.screens[0], // Assuming first screen
            },
          });
        }
      }
    }
  }, [editMode, existingFormData, isLoadingExistingForm]);

  if (isLoadingAppConfigMdmsData || (editMode && isLoadingExistingForm)) {
    return <Loader page={true} variant={"PageLoader"} />;
  }
  const closeToast = () => {
    setShowToast(null);
  };

  function createLocaleArrays() {
    const result = {};
    // Dynamically determine locales
    const locales = Object.keys(locState[0]).filter((key) => key.includes(currentLocale.slice(currentLocale.indexOf("_"))) && key !== currentLocale);
    locales.unshift(currentLocale);
    locales.forEach((locale) => {
      result[locale] = locState
        ?.filter((item) => typeof item?.code !== "boolean")
        ?.map((item) => ({
          code: item.code,
          message: item[locale] || " ",
          module: localeModule ? localeModule : "hcm-dummy-module",
          locale: locale,
        }));
    });

    return result;
  }
  const findConfig = (bindTo, config) => {
    return config.reduce(
      (res, item) => res || (item.bindTo === bindTo ? item : Array.isArray(item.conditionalField) ? findConfig(bindTo, item.conditionalField) : null),
      null
    );
  };
  const validateFromState = (state, drawerPanelConfig, locS, cL) => {
    const errors = {};
    const fields = state?.fields;
    const headerFields = state?.headerFields;

    for (let i = 0; i < headerFields.length; i++) {
      if (headerFields[i]?.jsonPath === "ScreenHeading") {
        const fieldItem = headerFields[i];
        const value = locS?.find((i) => i?.code === fieldItem?.value)?.[cL] || null;
        if (!value || value.trim() === "") {
          return { type: "error", value: `${t("HEADER_FIELD_EMPTY_ERROR")}` };
        }
      }
    }
    const validateValue = (value, validation, label, a, b) => {
      if (!validation) return null;

      // required check
      if (validation.required) {
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return validation.message || `${t(`${label || "FIELD"}_REQUIRED_FOR`)} ${a?.label}`;
        }
      }

      // pattern check
      if (validation.pattern && value) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return validation.message || `${t(`${label || "Field"}_IS_INVALID`)}`;
        }
      }

      return null; // no error
    };
    for (let i = 0; i < fields.length; i++) {
      const fieldObj = fields[i];

      // For each key in field object
      for (const key in fieldObj) {
        // Find config matching this key
        const config = findConfig(key, drawerPanelConfig);
        if (!config) continue; // no config, skip validation for this key

        // get validation object (could be an array, object, or nested)
        let validation = config.validation;

        // If validation is an array, find validation matching key or default
        if (Array.isArray(validation)) {
          // example: validation array might have { key: "toArray", required: true, message: "..." }
          // You can adapt this as per your validation array structure
          const valFromArray = validation.find((v) => v.key === key || !v.key);
          if (valFromArray) validation = valFromArray;
          else validation = null;
        }

        // Validate the field value
        const value = fieldObj[key];

        const errorMsg = validateValue(fetchLoc(value), validation, config.label, fieldObj, config);

        if (errorMsg) {
          // Use a unique key to identify error (field index + key)
          return errorMsg;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        type: "error",
        errors,
      };
    }

    return false;
  };

  const locUpdate = async () => {
    const localeArrays = createLocaleArrays();
    let updateCount = 0;
    let updateSuccess = false;
    try {
      setLoading(true);
      const result = await localisationMutate(localeArrays);
      updateCount = updateCount + 1;
      updateSuccess = true;
    } catch (error) {
      setLoading(false);
      setShowToast({ key: "error", label: "CONFIG_SAVE_FAILED" });
      console.error(`Error sending localisation data:`, error);
    }
    return;
  };
  const handleSubmit = async (finalSubmit) => {
    
    // Validate form before proceeding
    const validationErrors = await validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors);
      
      // Show toast with first error
      const firstError = Object.values(validationErrors)[0];
      setShowToast({ 
        key: "error", 
        label: firstError,
        transitionTime: 5000
      });
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});
    
    // Comment out localization processing - use plain text values directly
    // const localeArrays = createLocaleArrays();
    let updateCount = 0;
    let updateSuccess = false;
    
    try {
      setLoading(true);
      
      // Comment out localization saving - we don't need it anymore
      // const result = await localisationMutate(localeArrays);
      // updateCount = updateCount + 1;
      // updateSuccess = true;
      
      // Set success to true since we're not doing localization
      updateSuccess = true;
      
      // Save form configuration to MDMS
      if (finalSubmit) {
        // Check if module and service are available from URL parameters
        if (!module || !service) {
          setShowToast({ 
            key: "error", 
            label: "MODULE_AND_SERVICE_REQUIRED",
            transitionTime: 5000
          });
          return;
        }
        
        try {
          // Transform form data to MDMS format - without localization
          const mdmsFormData = transformFormDataToMDMS(
            {
              ...state,
              // Remove localization data - we don't need it
              // localization: localeArrays
            },
            module,
            service,
            currentFormName, // Use current form name from state
            currentFormDescription // Use current form description from state
          );
          
          let result;
          if (editMode) {
            // Update existing form
            if (existingFormData) {
              const updatePayload = {
                id: existingFormData.id, // Ensure ID is included
                tenantId: existingFormData.tenantId,
                schemaCode: existingFormData.schemaCode,
                uniqueIdentifier: existingFormData.uniqueIdentifier,
                data: mdmsFormData, // Replace the entire data object
                isActive: existingFormData.isActive,
                auditDetails: existingFormData.auditDetails
              };
              result = await updateFormConfig.mutateAsync(updatePayload);
              clearUnsavedChanges();
              setShowToast({ 
                key: "success", 
                label: "FORM_UPDATED_SUCCESSFULLY",
                transitionTime: 5000
              });
              setTimeout(() => {
                history.push(`/${window.contextPath}/employee/servicedesigner/forms?module=${module}&service=${service}`);
            }, 3000);
            } else {
              // If editMode is true but existingFormData is not available, 
              // we need to search for the form first
              try {
                // Search for the form by formName
                const searchPayload = {
                  MdmsCriteria: {
                    tenantId: tenantId,
                    schemaCode: "Studio.Forms",
                    isActive: true,
                    filters: {
                      "data.formName": formName,
                    },
                  },
                };
                const searchResponse = await Digit.CustomService.getResponse({
                  url: `/${mdms_context_path}/v2/_search`,
                  params: { tenantId: tenantId },
                  body: searchPayload,
                });
                
                const foundForm = searchResponse?.mdms?.[0];
                if (foundForm) {
                  const updatePayload = {
                    id: foundForm.id, // Ensure ID is included
                    tenantId: foundForm.tenantId,
                    schemaCode: foundForm.schemaCode,
                    uniqueIdentifier: foundForm.uniqueIdentifier,
                    data: mdmsFormData, // Replace the entire data object
                    isActive: foundForm.isActive,
                    auditDetails: foundForm.auditDetails
                  };
                  result = await updateFormConfig.mutateAsync(updatePayload);
                  clearUnsavedChanges();
                  setShowToast({ 
                    key: "success", 
                    label: "FORM_UPDATED_SUCCESSFULLY",
                    transitionTime: 5000
                  });
                  setTimeout(() => {
                    history.push(`/${window.contextPath}/employee/servicedesigner/forms?module=${module}&service=${service}`);
                }, 3000);
                } else {
                  throw new Error("Form not found for update");
                }
              } catch (searchError) {
                console.error("Error searching for existing form:", searchError);
                setShowToast({ 
                  key: "error", 
                  label: "FORM_NOT_FOUND_FOR_UPDATE",
                  transitionTime: 5000
                });
                return;
              }
            }
          } else {
            // Create new form
            result = await saveFormConfig.mutateAsync(mdmsFormData);
            clearUnsavedChanges();
            setShowToast({ 
              key: "success", 
              label: "FORM_SAVED_SUCCESSFULLY",
              transitionTime: 5000
            });
            setTimeout(() => {
              history.push(`/${window.contextPath}/employee/servicedesigner/forms?module=${module}&service=${service}`);
          }, 3000);
          }
          
        } catch (mdmsError) {
          console.error("Error saving/updating form to MDMS:", mdmsError);
          setShowToast({ 
            key: "error", 
            label: t("MDMS_CREATE_BACKEND_ERROR"),
            transitionTime: 5000
          });
        }
      }
      
    } catch (error) {
      setLoading(false);
      setShowToast({ key: "error", label: "CONFIG_SAVE_FAILED" });
      console.error(`Error sending localisation data:`, error);
    }
    
    setShowPopUp(false);
    setLoading(false);
    
    if (updateSuccess || !updateCount) {
      onSubmit(state, finalSubmit);
    }
    
    console.info(editMode ? "FORM_UPDATE_SUCCESS" : "FORM_SAVE_SUCCESS");
  };

  const currentPage = parseInt(pageTag?.split(" ")[1]);

  return (
    <AppConfigContext.Provider value={{ 
      state, 
      dispatch, 
      openAddFieldPopup,
      currentFormName,
      setCurrentFormName,
      currentFormDescription,
      setCurrentFormDescription,
      selectedPreviewSection,
      setSelectedPreviewSection,
      validationErrors,
      setValidationErrors,
      hasUnsavedChanges,
      setHasUnsavedChanges
    }}>
      {loading && <Loader page={true} variant={"OverlayLoader"} loaderText={t("SAVING_CONFIG_IN_SERVER")} />}
      
      <div style={{ marginRight: "1.5rem", position: "relative" }}>
        {/* Add Section Button - Top Right */}
        <Button
          type={"button"}
          size={"medium"}
          variation={"primary"}
          label={t("ADD_SECTION")}
          onClick={() => {
            setShowSectionPopup(true);
          }}
          style={{ 
            position: "absolute", 
            top: "-0.5rem", 
            right: "0.5rem",
            zIndex: 10,
            fontSize: "0.875rem",
            padding: "0.5rem 1rem",
            fontWeight: "500"
          }}
        />
        
        <AppPreview 
          data={state?.screenData?.[0]} 
          selectedField={state?.drawerField} 
          t={useCustomT}
          selectedSection={selectedPreviewSection}
          onSectionChange={(sectionIndex) => setSelectedPreviewSection(sectionIndex)}
        />
      </div>
      {/* <div className="appConfig-flex-action">
        <Button
          className="app-configure-action-button"
          variation="secondary"
          label={t("PREVIOUS")}
          title={t("PREVIOUS")}
          icon="ArrowBack"
          isDisabled={currentPage === 1}
          onClick={() => back()}
        />
        <span className="app-config-tag-page"> {pageTag} </span>
        <Button
          className="app-configure-action-button"
          variation="secondary"
          label={t("NEXT")}
          title={t("NEXT")}
          icon="ArrowForward"
          isSuffix={true}
          isDisabled={nextButtonDisable}
          onClick={async () => {
            await handleSubmit();
          }}
        />
      </div> */}
      {true && (
        <SidePanel
          bgActive
          className="app-configuration-side-panel"
          defaultOpenWidth={369}
          closedContents={[]}
          closedFooter={[<en />]}
          closedHeader={[]}
          closedSections={[]}
          defaultClosedWidth=""
          footer={[
            <div className="app-configure-drawer-footer-container">
              {enabledModules?.length > 1 ? (
                <Button
                  className="app-configure-drawer-footer-button"
                  type={"button"}
                  size={"medium"}
                  variation={"secondary"}
                  icon={"Translate"}
                  label={t("ADD_LOCALISATION")}
                  onClick={() => {
                    setShowPopUp(true);
                  }}
                />
              ) : null}
            </div>,
          ]}
          header={[
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="typography heading-m">
                {t("FIELD_CONFIGURATION")}
              </div>
              {editMode && (
                <Tag
                  label={t("EDIT_MODE")}
                  style={{ background: "#FFF3CD", color: "#856404", border: "1px solid #FFEAA7" }}
                />
              )}
            </div>,
          ]}
          hideScrollIcon
          isDraggable={false}
          position="right"
          sections={[]}
          styles={{}}
          type="static"
        >
          {state?.drawerField ? (
            <>
              <Button
                className=""
                variation="secondary"
                label={t("BACK")}
                title={t("BACK")}
                icon="ArrowBack"
                size="small"
                onClick={() =>
                  dispatch({
                    type: "UNSELECT_DRAWER_FIELD",
                  })
                }
              />
              <DrawerFieldComposer />
            </>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <AppFieldScreenWrapper />
            </DndProvider>
          )}
        </SidePanel>
      )}

      {showPopUp && (
        <PopUp
          type={"default"}
          heading={t("ADD_LOCALISATION")}
          children={[
            <div>
              {state?.screenData
                ?.find((i) => i.name === state?.currentScreen?.name)
                ?.cards?.map((card) => [
                  ...card?.fields?.map((field) => ({ message: field?.label })), // Extract label for fields
                  ...card?.headerFields?.map((headerField) => ({ message: headerField?.value })), // Extract value for header fields
                ])
                ?.flat()}
            </div>,
          ]}
          onOverlayClick={() => {
            setShowPopUp(false);
          }}
          onClose={() => {
            setShowPopUp(false);
          }}
          equalWidthButtons={"false"}
          footerChildren={[
            <Button
              type={"button"}
              size={"large"}
              variation={"secondary"}
              label={t("CLOSE")}
              onClick={() => {
                setShowPopUp(false);
              }}
            />,
            <Button
              type={"button"}
              size={"large"}
              variation={"primary"}
              label={t("SUBMIT")}
              onClick={() => {
                locUpdate();
                setShowPopUp(false);
              }}
            />,
          ]}
        >
          <AppLocalisationTable currentScreen={state?.screenData?.[0]?.name} state={state} />
        </PopUp>
      )}
      {popupData && (
        <PopUp
          className="app-config-add-field-popup"
          type={"default"}
          heading={t("ADD_FIELD_POP_HEADING")}
          children={[
            <FieldV1
              required={true}
              label={`${t("ADD_FIELD_TYPE")}`}
              type={"dropdown"}
              value={addFieldData?.type}
              config={{
                step: "",
              }}
              onChange={(value) => {
                const isIdPopulator = value?.type === "idPopulator";
                setAddFieldData((prev) => ({
                  ...prev,
                  type: value,
                  ...(isIdPopulator && { isMdms: true, MdmsDropdown: true, schemaCode: "HCM.ID_TYPE_OPTIONS_POPULATOR" }),
                }));
              }}
              populators={{
                t: t,
                title: "ADD_FIELD_TYPE",
                fieldPairClassName: "",
                options: (state?.MASTER_DATA?.AppFieldType || [])
                  .filter((item) => item?.metadata?.type !== "template" && item?.metadata?.type !== "dynamic")
                  ?.sort((a, b) => a?.order - b?.order),
                optionsKey: "type",
              }}
              error={showError?.dropdown ? t(showError?.dropdown) : null}
            />,
            <FieldV1
              required={true}
              type={"text"}
              label={`${t("ADD_FIELD_LABEL")}`}
              value={addFieldData?.label || ""}
              config={{
                step: "",
              }}
              onChange={(event) => {
                setAddFieldData((prev) => ({
                  ...prev,
                  label: event.target.value,
                }));
              }}
              populators={{ fieldPairClassName: "" }}
              error={showError?.label ? t(showError?.label) : null}
            />,
          ]}
          onOverlayClick={() => {
            setShowError(null);
            setPopupData(null);
            setAddFieldData(null);
          }}
          onClose={() => {
            setShowError(null);
            setPopupData(null);
            setAddFieldData(null);
          }}
          equalWidthButtons={"false"}
          footerChildren={[
            <Button
              type={"button"}
              size={"large"}
              variation={"secondary"}
              label={t("CLOSE")}
              onClick={() => {
                setShowError(null);
                setPopupData(null);
                setAddFieldData(null);
              }}
            />,
            <Button
              type={"button"}
              size={"large"}
              variation={"primary"}
              label={t("SUBMIT")}
              onClick={() => {
                if (!addFieldData) {
                  setShowError({ label: "FIELD_TYPE_AND_LABEL_REQUIRED", dropdown: "FIELD_TYPE_AND_LABEL_REQUIRED" });
                  return;
                } else if (!addFieldData?.label?.trim() && !addFieldData?.type) {
                  setShowError({ label: "FIELD_TYPE_AND_LABEL_REQUIRED", dropdown: "FIELD_TYPE_AND_LABEL_REQUIRED" });
                  return;
                } else if (!addFieldData?.type) {
                  setShowError({ dropdown: "FIELD_TYPE_AND_LABEL_REQUIRED" });
                  return;
                } else if (!addFieldData?.label?.trim()) {
                  setShowError({ label: "FIELD_TYPE_AND_LABEL_REQUIRED" });
                  return;
                }
                dispatch({
                  type: "ADD_FIELD",
                  payload: {
                    ...popupData,
                    fieldData: addFieldData,
                  },
                });
                setShowError(null);
                setPopupData(null);
                setAddFieldData(null);
              }}
            />,
          ]}
        ></PopUp>
      )}
      {showToast && (
        <Toast
          type={showToast?.key === "error" ? "error" : showToast?.key === "info" ? "info" : showToast?.key === "warning" ? "warning" : "success"}
          label={t(showToast?.label)}
          transitionTime={showToast.transitionTime}
          onClose={closeToast}
        />
      )}
      
      {/* Section Popup */}
      {showSectionPopup && (
        <PopUp
          type={"default"}
          heading={t("ADD_SECTION")}
          children={[
            <div style={{ padding: "1rem 0" }}>
              {/* Custom Section Button */}
              <div style={{ 
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#fff"
              }}
              onClick={() => {
                const newSectionIndex = state?.screenData?.[0]?.cards?.length || 0;
                dispatch({
                  type: "ADD_SECTION",
                  payload: {
                    currentScreen: state?.screenData?.[0],
                    sectionName: "New Section",
                    sectionDescription: "Description for the new section",
                  },
                });
                setSelectedPreviewSection(newSectionIndex);
                setShowSectionPopup(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
                e.target.style.borderColor = "black";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.borderColor = "#e9ecef";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="typography heading-s" style={{ marginBottom: "0.25rem", color: "black" }}>
                      {t("CUSTOM_SECTION")}
                    </div>
                    <div className="typography body-s" style={{ color: "#666" }}>
                      {t("CREATE_NEW_SECTION")}
                    </div>
                  </div>
                  {/* <div style={{ 
                    width: "24px", 
                    height: "24px", 
                    borderRadius: "50%", 
                    backgroundColor: "#c84c0e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>+</span>
                  </div> */}
                </div>
              </div>

              {/* Address Template Button */}
              <div style={{ 
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#fff"
              }}
              onClick={() => {
                dispatch({
                  type: "TOGGLE_ADDRESS_DETAILS",
                  payload: {
                    enabled: true,
                    currentScreen: state?.screenData?.[0],
                    boundaryData: [],
                  },
                });
                setShowSectionPopup(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
                e.target.style.borderColor = "black";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.borderColor = "#e9ecef";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="typography heading-s" style={{ marginBottom: "0.25rem" }}>
                      {t("ADDRESS_SECTION")}
                    </div>
                    <div className="typography body-s" style={{ color: "#666" }}>
                      {t("ADD_ADDRESS_FIELDS")}
                    </div>
                  </div>
                  {/* <div style={{ 
                    width: "24px", 
                    height: "24px", 
                    borderRadius: "50%", 
                    backgroundColor: "#c84c0e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>📍</span>
                  </div> */}
                </div>
              </div>

              {/* Applicant Template Button */}
              <div style={{ 
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#fff"
              }}
              onClick={() => {
                dispatch({
                  type: "TOGGLE_APPLICANT_DETAILS",
                  payload: {
                    enabled: true,
                    currentScreen: state?.screenData?.[0],
                  },
                });
                setShowSectionPopup(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f8f9fa";
                e.target.style.borderColor = "black";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.borderColor = "#e9ecef";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="typography heading-s" style={{ marginBottom: "0.25rem", color: "black" }}>
                      {t("APPLICANT_SECTION")}
                    </div>
                    <div className="typography body-s" style={{ color: "#666" }}>
                      {t("APPLICANTS_DETAILS_DESC")}
                    </div>
                  </div>
                  {/* <div style={{ 
                    width: "24px", 
                    height: "24px", 
                    borderRadius: "50%", 
                    backgroundColor: "#c84c0e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>👤</span>
                  </div> */}
                </div>
              </div>

              {/* Document Template Button (Disabled) */}
              <div style={{ 
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                cursor: "not-allowed",
                transition: "all 0.2s ease",
                backgroundColor: "#f8f9fa",
                opacity: "0.6"
              }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="typography heading-s" style={{ marginBottom: "0.25rem", color: "#999" }}>
                      {t("DOCUMENT_SECTION")}
                    </div>
                    <div className="typography body-s" style={{ color: "#999" }}>
                      {t("DOCUMENT_DESC")}
                    </div>
                  </div>
                  <div style={{ 
                    width: "24px", 
                    height: "24px", 
                    borderRadius: "50%", 
                    backgroundColor: "#ccc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>📄</span>
                  </div>
                </div>
              </div>
            </div>,
          ]}
          onOverlayClick={() => {
            setShowSectionPopup(false);
          }}
          onClose={() => {
            setShowSectionPopup(false);
          }}
          equalWidthButtons={"false"}
          footerChildren={[
            <Button
              type={"button"}
              size={"large"}
              variation={"secondary"}
              label={t("CANCEL")}
              onClick={() => {
                setShowSectionPopup(false);
              }}
            />,
          ]}
        />
      )}
      
      {/* Form Name Popup */}
      {showFormNamePopup && (
        <PopUp
          type={"default"}
          heading={t("CREATE_NEW_FORM")}
          children={[
            <div style={{ padding: "1rem 0" }}>
              <FieldV1
                required={true}
                type={"text"}
                label={t("FORM_NAME")}
                value={currentFormName}
                config={{
                  step: "",
                }}
                onChange={(event) => {
                  setCurrentFormName(event.target.value);
                  // Call parent's onChange function
                  if (onFormNameChange) {
                    onFormNameChange(event.target.value);
                  }
                }}
                populators={{ fieldPairClassName: "" }}
                error={validationErrors.formName ? t(validationErrors.formName) : null}
              />
              <FieldV1
                type={"textarea"}
                label={t("FORM_DESCRIPTION")}
                value={currentFormDescription}
                config={{
                  step: "",
                }}
                onChange={(event) => {
                  setCurrentFormDescription(event.target.value);
                  // Call parent's onChange function
                  if (onFormDescriptionChange) {
                    onFormDescriptionChange(event.target.value);
                  }
                }}
                populators={{ fieldPairClassName: "" }}
              />
            </div>,
          ]}
          onOverlayClick={() => {
            setShowFormNamePopup(false);
          }}
          onClose={() => {
            setShowFormNamePopup(false);
          }}
          equalWidthButtons={"false"}
          footerChildren={[
            <Button
              type={"button"}
              size={"large"}
              variation={"secondary"}
              label={t("CANCEL")}
              onClick={() => {
                setShowFormNamePopup(false);
              }}
            />,
            <Button
              type={"button"}
              size={"large"}
              variation={"primary"}
              label={t("CREATE_FORM")}
              onClick={() => {
                if (currentFormName?.trim()) {
                  setShowFormNamePopup(false);
                  setValidationErrors({}); // Clear any existing validation errors
                } else {
                  setValidationErrors({ formName: "FORM_NAME_REQUIRED" });
                }
              }}
            />,
          ]}
        />
      )}
      <Footer
        actionFields={[
          <Button
            type={"button"}
            style={{ marginLeft: "2.5rem", width: "14rem" }}
            label={t("HCM_BACK")}
            variation={"secondary"}
            t={t}
            onClick={() => {
              window.history.back();
            }}
          ></Button>,
          <Button
            type={"button"}
            label={editMode ? t("UPDATE_FORM") : t("PROCEED_TO_PREVIEW")}
            variation={"primary"}
            onClick={() => handleSubmit(true)}
            style={{ width: "14rem" }}
            t={t}
          ></Button>,
        ]}
        className={"new-actionbar"}
      />
    </AppConfigContext.Provider>
  );
}

export default React.memo(AppConfigurationWrapper);
