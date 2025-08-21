import React, { useEffect, useState, useRef } from "react";
import LandingPageConfig from "../../config/LandingPageConfig";
import axios from "axios";
import {
  Card,
  CardSectionHeader,
  CardText,
  CardHeader,
} from "@egovernments/digit-ui-react-components";
import ServiceCard from "../../components/ServiceCard";
import {
  Toggle,
  CustomSVG,
  Loader,
  PopUp,
  TextInput,
  Button,
  TextBlock,
  TextArea,
  AlertCard,
} from "@egovernments/digit-ui-components";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useServiceConfigAPI } from "../../hooks/useServiceConfigAPI";

// Utility to build card data
export const buildCardData = (drafts = [], published = [], t, queryStrings) => {
  const publishedCards = published.map((item) => ({
    title: `${item?.module} ${item.businessService}` || item.service || "Unnamed Service",
    description: `Manage ${item.businessService || item.service} services for your citizens`,
    link: `employee/publicservices/modules?selectedPath=Apply&module=${item?.module}&service=${item?.businessService || item?.service}`,
    module: item?.module,
    createdDate:
      Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
    service: item?.businessService || item?.service,
  }));

  const draftCards = drafts.map((item) => ({
    title: item.uniqueIdentifier || "Unnamed Draft Service",
    description: "Service group still in draft mode",
    link: `employee/servicedesigner/Service-Builder-Home?module=${item?.data?.module}&service=${item?.data?.service}&edit=true`,
    createdDate:
      Digit.DateUtils.ConvertEpochToDate(item?.auditDetails?.createdTime) || "N/A",
    module: item?.data?.module,
    service: item?.data?.service,
  }));

  const templates = [
    {
      title: "Property Tax",
      description: "Assessment and payment system for Mumbai Municipal Corporation",
      module: "PROPERTY_TAX",
      service: "PROPERTY_TAX",
    },
    {
      title: "Water Tax",
      description: "Manage water tax services for your citizens",
      module: "WATER_TAX",
      service: "WATER_TAX",
    },
  ];

  return {
    Published: [
      {
        title: t("STUDIO_NEW_SERVICE_HEADER"),
        description: t("STUDIO_NEW_SERVICE_DESCRIPTION"),
        isCreateCard: true,
        onClick: true,
        module: null,
        service: null,
      },
      ...publishedCards,
    ],
    Drafts: draftCards,
    templates: templates,
  };
};

// Utility to split drafts and published
export const extractDraftsAndPublished = (mdmsData = [], serviceData = []) => {
  const serviceIdentifiers = serviceData.map(
    (item) => `${item.module}.${item.businessService}`
  );

  const drafts = mdmsData.filter(
    (item) => !serviceIdentifiers.includes(item?.uniqueIdentifier) && item?.isActive
  );

  const uniqueModules = [];
  const modulesSet = new Set();

  serviceData.forEach((item) => {
    if (!modulesSet.has(item.module)) {
      modulesSet.add(item.module);
      uniqueModules.push(item);
    }
  });

  const published = uniqueModules;
  return { drafts, published };
};

const LandingPage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const queryStrings = Digit.Hooks.useQueryParams();

  const [isLoading, setIsLoading] = useState(true);
  const [mdmsData, setMdmsData] = useState([]);
  const [publicServices, setPublicServices] = useState([]);
  const [cardData, setCardData] = useState({});
  const [showAllCards, setShowAllCards] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importData, setImportData] = useState("");
  const [importModuleName, setImportModuleName] = useState("");
  const [importServiceName, setImportServiceName] = useState("");
  
  // Validation states
  const [importErrors, setImportErrors] = useState({});
  const [isImporting, setIsImporting] = useState(false);

  const [selectedToggle, setSelectedToggle] = useState(
    LandingPageConfig.find((item) => item.type === "ToggleGroup")?.default || ""
  );

  const containerRef = useRef(null);
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const visibleRows = 2;
  const [maxCardsToShow, setMaxCardsToShow] = useState(8); // default fallback

  localStorage.removeItem("canvasElements");
  localStorage.removeItem("connections");

  useEffect(() => {
    const calculateCardsPerRow = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 250; // adjust if your cards differ
      const gap = 16;

      const calculated = Math.floor((containerWidth + gap) / (cardWidth + gap));
      const newCardsPerRow = Math.max(1, calculated);

      setCardsPerRow(newCardsPerRow);
      setMaxCardsToShow(newCardsPerRow * visibleRows);
    };

    calculateCardsPerRow();

    window.addEventListener("resize", calculateCardsPerRow);
    return () => window.removeEventListener("resize", calculateCardsPerRow);
  }, []);

  // Service configuration API hooks
  const { saveServiceConfig } = useServiceConfigAPI();

  const handleProceedToServiceBuilder = async () => {
    if (!moduleName.trim() || !serviceName.trim()) return;
  
    const sanitizedModule = moduleName.trim().replace(/\s+/g, "_");
    const sanitizedService = serviceName.trim().replace(/\s+/g, "_");
  
    try {
      // Create Studio.ServiceConfigurationDrafts entry with empty values
      const emptyServiceConfig = {
        module: sanitizedModule,
        service: sanitizedService,
        pdf: [],
        bill: {},
        idgen: [],
        inbox: {},
        rules: {},
        access: {},
        fields: [],
        enabled: [],
        payment: {},
        uiforms: [],
        uiroles: [],
        boundary: {},
        workflow: {},
        apiconfig: [],
        applicant: {},
        documents: [],
        calculator: {},
        uiworkflow: {},
        localization: {},
        notification: {},
        uichecklists: [],
        uinotifications: []
      };

      await saveServiceConfig.mutateAsync(emptyServiceConfig);
      
      // Close the popup
      setShowCreatePopup(false);
      setModuleName("");
      setServiceName("");
      
      // Navigate to service builder
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedModule
      )}&service=${encodeURIComponent(sanitizedService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
      
    } catch (error) {
      console.error("Error creating draft:", error);
      // You might want to show an error message to the user here
      // For now, we'll still navigate even if the draft creation fails
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedModule
      )}&service=${encodeURIComponent(sanitizedService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
    }
  };

  const handleImportService = async () => {
    // Clear previous errors
    setImportErrors({});
    
    // Validate input data
    const validationErrors = validateImportData();
    if (Object.keys(validationErrors).length > 0) {
      setImportErrors(validationErrors);
      return;
    }

    const sanitizedModule = importModuleName.trim().replace(/\s+/g, "_");
    const sanitizedService = importServiceName.trim().replace(/\s+/g, "_");

    // Check if service already exists
    const serviceExists = await checkServiceExists(sanitizedModule, sanitizedService);
    if (serviceExists) {
      setImportErrors({
        serviceName: "A service with this name already exists. Please use a different name."
      });
      return;
    }

    setIsImporting(true);
  
    try {
      // Parse the JSON data
      const parsedData = JSON.parse(importData);
      
      // Convert published service config to draft service config
      const draftConfig = convertPublishedToDraftConfig(parsedData, sanitizedModule, sanitizedService);
      
      // Save the draft configuration
      await saveServiceConfig.mutateAsync(draftConfig);
      
      // Close the popup
      setShowImportPopup(false);
      setImportData("");
      setImportModuleName("");
      setImportServiceName("");
      setImportErrors({});
      setIsImporting(false);
      
      // Navigate to service builder
      const url = `employee/servicedesigner/Service-Builder-Home?module=${encodeURIComponent(
        sanitizedModule
      )}&service=${encodeURIComponent(sanitizedService)}`;
    
      history.push(`/${window.contextPath}/${url}`);
      
    } catch (error) {
      console.error("Error importing service:", error);
      setIsImporting(false);
      
      // Show network/backend error
      setImportErrors({
        general: "Import failed due to a network error. Please try again."
      });
    }
  };

  // Function to create address section
  const createAddressSection = () => {
    return {
      name: "addressSection",
      type: "object",
      cards: [
        {
          fields: [
            {
              type: "text",
              label: "Pincode",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              jsonPath: "AddressPincode",
              metaData: {},
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              defaultValue: "",
              errorMessage: ""
            },
            {
              type: "text",
              label: "Street Name",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              jsonPath: "AddressStreet",
              metaData: {},
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              defaultValue: "",
              errorMessage: ""
            },
            {
              type: "dropdown",
              label: "City",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              jsonPath: "AddressCity",
              metaData: {},
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              defaultValue: "",
              errorMessage: "",
              isBoundaryData: true,
              dropDownOptions: []
            }
          ],
          header: "Address Details",
          description: "Address Information",
          headerFields: [
            {
              type: "text",
              label: "SCREEN_HEADING",
              value: "Address Details",
              active: true,
              jsonPath: "ScreenHeading",
              metaData: {},
              required: true
            },
            {
              type: "text",
              label: "SCREEN_DESCRIPTION",
              value: "Please provide your address information",
              active: true,
              jsonPath: "Description",
              metaData: {},
              required: true
            }
          ]
        }
      ],
      order: 1,
      config: {
        enableComment: false,
        enableFieldAddition: true,
        allowFieldsAdditionAt: ["body"],
        enableSectionAddition: false,
        allowCommentsAdditionAt: ["body"]
      },
      parent: "REGISTRATIONFLOW",
      navigateTo: {
        name: "nextScreen",
        type: "form"
      },
      actionLabel: "NEXT"
    };
  };

  // Function to create applicant section
  const createApplicantSection = () => {
    return {
      name: "applicantSection",
      type: "object",
      cards: [
        {
          fields: [
            {
              type: "text",
              label: "Name",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              jsonPath: "ApplicantName",
              metaData: {},
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              defaultValue: "",
              errorMessage: ""
            },
            {
              type: "mobileNumber",
              label: "Mobile Number",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              hideSpan: true,
              jsonPath: "ApplicantMobile",
              metaData: { hideSpan: true },
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              populators: { hideSpan: true },
              defaultValue: "",
              errorMessage: ""
            },
            {
              type: "dropdown",
              label: "Gender",
              value: "",
              active: true,
              tooltip: "",
              helpText: "",
              jsonPath: "ApplicantGender",
              metaData: {},
              readOnly: false,
              required: true,
              deleteFlag: true,
              innerLabel: "",
              defaultValue: "",
              errorMessage: "",
              dropDownOptions: [
                { name: "Male", value: "male" },
                { name: "Female", value: "female" },
                { name: "Other", value: "other" }
              ]
            }
          ],
          header: "Applicant Details",
          description: "Applicant Information",
          headerFields: [
            {
              type: "text",
              label: "SCREEN_HEADING",
              value: "Applicant Details",
              active: true,
              jsonPath: "ScreenHeading",
              metaData: {},
              required: true
            },
            {
              type: "text",
              label: "SCREEN_DESCRIPTION",
              value: "Please provide your personal information",
              active: true,
              jsonPath: "Description",
              metaData: {},
              required: true
            }
          ]
        }
      ],
      order: 1,
      config: {
        enableComment: false,
        enableFieldAddition: true,
        allowFieldsAdditionAt: ["body"],
        enableSectionAddition: false,
        allowCommentsAdditionAt: ["body"]
      },
      parent: "REGISTRATIONFLOW",
      navigateTo: {
        name: "nextScreen",
        type: "form"
      },
      actionLabel: "NEXT"
    };
  };

  // Function to convert published service fields to uiforms structure
  const convertFieldsToUiforms = (fields, newModule, newService, boundary = null, applicant = null) => {
    // Create a default form configuration
    const defaultForm = {
      formName: `${newModule} ${newService} Form`,
      isActive: true,
      formConfig: {
        screens: []
      },
      localization: {},
      formDescription: `Form for ${newModule} ${newService} service`
    };

    // Convert each field to a screen
    const screens = fields.map((field, index) => {
      const screen = {
        name: field.name || `screen_${index}`,
        type: field.type || "object",
        cards: []
      };

      // Convert field properties to form fields
      if (field.properties && field.properties.length > 0) {
        const card = {
          fields: field.properties.map(prop => convertPropertyToField(prop)),
          header: field.label || field.name,
          description: field.label || field.name,
          headerFields: [
            {
              type: "text",
              label: "SCREEN_HEADING",
              value: field.label || field.name,
              active: true,
              jsonPath: "ScreenHeading",
              metaData: {},
              required: true,
              isLocalised: true
            },
            {
              type: "textarea",
              label: "SCREEN_DESCRIPTION",
              value: field.label || field.name,
              active: true,
              jsonPath: "Description",
              metaData: {},
              required: true,
              isLocalised: true
            }
          ]
        };
        screen.cards.push(card);
      } else {
        // If no properties, create a simple field
        const card = {
          fields: [convertPropertyToField(field)],
          header: field.label || field.name,
          description: field.label || field.name,
          headerFields: [
            {
              type: "text",
              label: "SCREEN_HEADING",
              value: field.label || field.name,
              active: true,
              jsonPath: "ScreenHeading",
              metaData: {},
              required: true,
              isLocalised: true
            },
            {
              type: "textarea",
              label: "SCREEN_DESCRIPTION",
              value: field.label || field.name,
              active: true,
              jsonPath: "Description",
              metaData: {},
              required: true,
              isLocalised: true
            }
          ]
        };
        screen.cards.push(card);
      }

      // Add screen configuration
      screen.order = index + 1;
      screen.config = {
        enableComment: false,
        enableFieldAddition: true,
        allowFieldsAdditionAt: ["body"],
        enableSectionAddition: false,
        allowCommentsAdditionAt: ["body"]
      };
      screen.parent = "REGISTRATIONFLOW";
      screen.navigateTo = {
        name: "nextScreen",
        type: "form"
      };
      screen.actionLabel = "NEXT";

      return screen;
    });

    // Add address section if boundary data exists
    if (boundary) {
      const addressSection = createAddressSection();
      addressSection.order = screens.length + 1;
      screens.push(addressSection);
    }

    // Add applicant section if applicant data exists
    if (applicant) {
      const applicantSection = createApplicantSection();
      applicantSection.order = screens.length + 1;
      screens.push(applicantSection);
    }

    defaultForm.formConfig.screens = screens;
    return [defaultForm];
  };

  // Function to convert a property to a form field
  const convertPropertyToField = (property) => {
    const field = {
      type: getFieldType(property),
      label: property.label || property.name,
      active: true,
      tooltip: "",
      helpText: "",
      jsonPath: property.name,
      metaData: {},
      readOnly: false,
      required: property.required || false,
      deleteFlag: true,
      innerLabel: "",
      defaultValue: property.defaultValue || "",
      errorMessage: ""
    };

    // Add type-specific properties
    switch (property.format) {
      case "text":
        field.maxLength = property.maxLength || 128;
        field.minLength = property.minLength || 2;
        break;
      case "number":
        field.maxLength = property.maxLength || 10;
        field.minLength = property.minLength || 1;
        break;
      case "mobileNumber":
        field.maxLength = property.maxLength || 256;
        field.minLength = property.minLength || 0;
        field.prefix = property.prefix || "91";
        field.hideSpan = true;
        field.populators = { hideSpan: true };
        break;
      case "radioordropdown":
        if (property.reference === "mdms") {
          field.schemaCode = property.schema;
          field.reference = "mdms";
        } else if (property.values && property.values.length > 0) {
          field.dropDownOptions = property.values.map(value => ({
            name: value,
            value: value.toLowerCase()
          }));
        }
        break;
      case "radio":
        if (property.reference === "mdms") {
          field.schemaCode = property.schema;
          field.reference = "mdms";
        } else if (property.values && property.values.length > 0) {
          field.dropDownOptions = property.values.map(value => ({
            name: value,
            value: value.toLowerCase()
          }));
        }
        break;
    }

    return field;
  };

  // Function to map service config field types to form field types
  const getFieldType = (property) => {
    switch (property.format) {
      case "text":
        return "text";
      case "number":
        return "number";
      case "date":
        return "date";
      case "mobileNumber":
        return "mobileNumber";
      case "radioordropdown":
        return "dropdown";
      case "radio":
        return "radio";
      default:
        return "text";
    }
  };

  // Function to convert published service notifications to uinotifications structure
  const convertNotificationsToUinotifications = (notification, newModule, newService) => {
    if (!notification) {
      return [];
    }

    const uinotifications = [];

    // Convert SMS notifications
    if (notification.sms && Array.isArray(notification.sms)) {
      notification.sms.forEach(smsNotif => {
        const uinotification = {
          title: smsNotif.code || "SMS Notification",
          subject: "",
          isActive: true,
          messageBody: smsNotif.template || "",
          additionalDetails: {
            type: "sms",
            category: `${newModule}_${newService}`,
            workflow: smsNotif.states || []
          }
        };
        uinotifications.push(uinotification);
      });
    }

    // Convert Push notifications
    if (notification.push && Array.isArray(notification.push)) {
      notification.push.forEach(pushNotif => {
        const uinotification = {
          title: pushNotif.code || "Push Notification",
          subject: "",
          isActive: true,
          messageBody: pushNotif.template || "",
          additionalDetails: {
            type: "push",
            category: `${newModule}_${newService}`,
            workflow: pushNotif.states || []
          }
        };
        uinotifications.push(uinotification);
      });
    }

    // Convert Email notifications
    if (notification.email && Array.isArray(notification.email)) {
      notification.email.forEach(emailNotif => {
        const uinotification = {
          title: emailNotif.code || "Email Notification",
          subject: emailNotif.subject || "",
          isActive: true,
          messageBody: emailNotif.template || "",
          additionalDetails: {
            type: "email",
            category: `${newModule}_${newService}`,
            workflow: emailNotif.states || []
          }
        };
        uinotifications.push(uinotification);
      });
    }

    return uinotifications;
  };

  // Function to convert published service checklist to uichecklists structure
  const convertChecklistToUichecklists = (checklist, newModule, newService) => {
    if (!checklist || !Array.isArray(checklist)) {
      return [];
    }

    const uichecklists = [];
    const uniqueChecklists = new Map(); // To avoid duplicates

    checklist.forEach(checklistItem => {
      // Use checklist name as key to avoid duplicates
      const checklistName = checklistItem.name;
      
      if (!uniqueChecklists.has(checklistName) && checklistItem.checklistData) {
        const uichecklist = {
          data: checklistItem.checklistData.data || [],
          name: checklistName,
          isActive: checklistItem.checklistData.isActive !== false, // Default to true
          description: checklistItem.checklistData.description || `Description for ${checklistName}`
        };
        
        uichecklists.push(uichecklist);
        uniqueChecklists.set(checklistName, uichecklist);
      }
    });

    return uichecklists;
  };



  // Helper function to filter out hardcoded system roles
  const filterHardcodedRoles = (role, moduleServicePrefix) => {
    // List of hardcoded system roles that should not appear in draft workflow states
    const hardcodedRoles = ['CITIZEN', 'STUDIO_ADMIN'];
    
    // Check if the role contains any hardcoded system role name
    const containsHardcodedRole = hardcodedRoles.some(hardcodedRole => 
      role.includes(hardcodedRole)
    );
    
    // Only include roles that have the module/service prefix (custom roles)
    // const hasModuleServicePrefix = role.includes(moduleServicePrefix);

    return !containsHardcodedRole;
    
    // Filter out roles that contain hardcoded role names, even if they have the prefix
    // return hasModuleServicePrefix && !containsHardcodedRole;
  };

  // Function to convert published service roles to uiroles structure
  const convertRolesToUiroles = (access, publishedModule, publishedService, newModule, newService, workflow = null) => {
    const oldModuleServicePrefix = `${publishedModule.toUpperCase()}_${publishedService.toUpperCase()}`;
    const uiroles = [];

    // Create a map to store role access permissions
    const roleAccessMap = new Map();
    
    // Extract roles and their access permissions from access.roles
    if (access && access.roles) {
      Object.entries(access.roles).forEach(([accessType, roleArray]) => {
        if (Array.isArray(roleArray)) {
          roleArray.forEach(role => {
            // Only include roles that have the module/service prefix (filter out hardcoded roles)
            if (filterHardcodedRoles(role, oldModuleServicePrefix)) {
              // Extract the role name without the module/service prefix
              const roleName = role.replace(oldModuleServicePrefix + "_", "").replace(/_/g, " ");
              
              // Initialize role access if not exists
              if (!roleAccessMap.has(roleName)) {
                roleAccessMap.set(roleName, {
                  editor: false,
                  viewer: false,
                  creater: false
                });
              }
              
              // Set the specific access permission to true
              const roleAccess = roleAccessMap.get(roleName);
              if (accessType === 'editor') {
                roleAccess.editor = true;
              } else if (accessType === 'viewer') {
                roleAccess.viewer = true;
              } else if (accessType === 'creator') {
                roleAccess.creater = true;
              }
            }
          });
        }
      });
    }
    
    // Extract roles from workflow states (for roles that might not be in access.roles)
    if (workflow && workflow.states) {
      workflow.states.forEach(state => {
        if (state.actions) {
          state.actions.forEach(action => {
            if (action.roles) {
              action.roles.forEach(role => {
                // Only include roles that have the module/service prefix (filter out hardcoded roles)
                if (filterHardcodedRoles(role, oldModuleServicePrefix)) {
                  // Extract the role name without the module/service prefix
                  const roleName = role.replace(oldModuleServicePrefix + "_", "").replace(/_/g, " ");
                  
                  // Initialize role access if not exists
                  if (!roleAccessMap.has(roleName)) {
                    roleAccessMap.set(roleName, {
                      editor: false,
                      viewer: false,
                      creater: false
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    // Convert each unique role to a uirole with proper access permissions
    roleAccessMap.forEach((accessPermissions, roleName) => {
      const uirole = {
        code: roleName.toUpperCase(),
        active: true,
        category: `${newModule}_${newService}`,
        isActive: true,
        description: `Description for ${roleName.toLowerCase()}`,
        additionalDetails: {
          access: accessPermissions
        }
      };
      uiroles.push(uirole);
    });

    return uiroles;
  };

  // Function to convert published service workflow to uiworkflow structure
  const convertWorkflowToUiworkflow = (workflow, newModule, newService, checklistConfig = [], oldModule, oldService) => {
    if (!workflow || !workflow.states) {
      return {};
    }

    const moduleServicePrefix = `${newModule.toUpperCase()}_${newService.toUpperCase()}`;
    const connections = [];
    const canvasElements = [];

    // Convert each state to a canvas element
    const baseTime = Date.now();
    workflow.states.forEach((state, index) => {
      const elementId = baseTime + index; // Generate unique ID
      
      // Determine node type based on state properties
      let nodeType = "intermediate";
      if (state.isStartState) {
        nodeType = "start";
      } else if (state.isTerminateState) {
        nodeType = "end";
      }

      // Create canvas element
      const canvasElement = {
        id: elementId,
        sla: state.sla ? Math.floor(state.sla / (1000 * 60 * 60)) : 24, // Convert milliseconds to hours
        desc: state.state || "State Description",
        form: [],
        name: state.state || (index === 0 ? "START" : `STATE_${index}`),
        type: "node",
        roles: [],
        nodetype: nodeType,
        position: {
          x: 100 + (index * 200),
          y: 100 + (index * 100)
        },
        checklist: [],
        sendnotif: [],
        generatedoc: []
      };

      // Set form for start state
      if (nodeType === "start") {
        canvasElement.form = {
          code: `${newModule} ${newService} Form`,
          name: `${newModule} ${newService} Form`
        };
      }

      // Set checklist based on checklist configuration
      if (checklistConfig && checklistConfig.length > 0) {
        const stateChecklists = checklistConfig.filter(checklist => 
          checklist.state === state.state || 
          (state.state === null && checklist.state === "START")
        );
        
        if (stateChecklists.length > 0) {
          canvasElement.checklist = stateChecklists.map(checklist => ({
            code: checklist.name,
            name: checklist.name
          }));
        }
      }

      // Add roles if available
      if (state.actions && state.actions.length > 0) {
        state.actions.forEach(action => {
          if (action.roles) {
            action.roles.forEach(role => {
              // Only include roles that have the module/service prefix (filter out hardcoded roles)
              if (filterHardcodedRoles(role, moduleServicePrefix)) {
                // Convert role to the format expected by uiworkflow
                const roleObj = {
                  code: role.replace(`${oldModule.toUpperCase()}_${oldService.toUpperCase()}_`, ""),
                  name: role.replace(`${oldModule.toUpperCase()}_${oldService.toUpperCase()}_`, "")
                };
                if (!canvasElement.roles.some(r => r.code === roleObj.code)) {
                  canvasElement.roles.push(roleObj);
                }
              }
            });
          }
        });
      }

      canvasElements.push(canvasElement);

      // Create connections between states
      if (state.actions && state.actions.length > 0) {
        state.actions.forEach((action, actionIndex) => {
          if (action.nextState) {
            // Find the target state element
            const targetState = workflow.states.find(s => s.state === action.nextState);
            if (targetState) {
              const targetIndex = workflow.states.indexOf(targetState);
              // Use the same ID generation logic as canvas elements
              const targetElementId = baseTime + targetIndex;
              const connection = {
                id: Date.now() + index + actionIndex,
                to: targetElementId,
                desc: `${action.action} action`,
                from: elementId,
                type: "action",
                label: action.action,
                aroles: action.roles ? action.roles
                  .filter(role => filterHardcodedRoles(role, moduleServicePrefix))
                  .map(role => ({
                    code: role.replace(`${oldModule.toUpperCase()}_${oldService.toUpperCase()}_`, ""),
                    name: role.replace(`${oldModule.toUpperCase()}_${oldService.toUpperCase()}_`, "")
                  })) : [],
                aassign: true,
                acomments: true
              };

              connections.push(connection);
            }
          }
        });
      }
    });

    return {
      connections: connections,
      canvasElements: canvasElements
    };
  };

  // Function to convert published service config to draft service config
  const convertPublishedToDraftConfig = (publishedConfig, newModule, newService) => {
    const moduleServicePrefix = `${newModule.toUpperCase()}_${newService.toUpperCase()}`;
    
    // Deep clone the published config to avoid mutating the original
    const draftConfig = JSON.parse(JSON.stringify(publishedConfig));
    
    // Update module and service names
    draftConfig.module = newModule;
    draftConfig.service = newService;
    
    // Update business service in workflow
    if (draftConfig.workflow) {
      draftConfig.workflow.businessService = `${newModule}.${newService}`;
    }
    
    // Update service references in various sections
    if (draftConfig.bill?.BusinessService) {
      draftConfig.bill.BusinessService.code = newService.toUpperCase();
      draftConfig.bill.BusinessService.businessService = newService.toUpperCase();
    }
    
    // Update tax head service references
    if (draftConfig.bill?.taxHead) {
      draftConfig.bill.taxHead.forEach(taxHead => {
        if (taxHead.service) {
          taxHead.service = newService.toUpperCase();
        }
      });
    }
    
    // Update tax period service references
    if (draftConfig.bill?.taxPeriod) {
      draftConfig.bill.taxPeriod.forEach(taxPeriod => {
        if (taxPeriod.service) {
          taxPeriod.service = newService.toUpperCase();
        }
      });
    }
    
    // Update idgen formats and names
    if (draftConfig.idgen) {
      const oldModuleServicePattern = `${publishedConfig.module}-${publishedConfig.service}`;
      const newModuleServicePattern = `${newModule}-${newService}`;
      
      draftConfig.idgen.forEach(idgen => {
        if (idgen.format) {
          idgen.format = idgen.format.replace(new RegExp(oldModuleServicePattern, 'g'), newModuleServicePattern);
        }
        if (idgen.idname) {
          idgen.idname = idgen.idname.replace(new RegExp(oldModuleServicePattern, 'g'), newModuleServicePattern);
        }
      });
    }
    
    // Update rules service references
    if (draftConfig.rules) {
      if (draftConfig.rules.registry?.service) {
        draftConfig.rules.registry.service = newService;
      }
      if (draftConfig.rules.calculator?.service) {
        draftConfig.rules.calculator.service = newService;
      }
      if (draftConfig.rules.validation?.service) {
        draftConfig.rules.validation.service = newService;
      }
      if (draftConfig.rules.validation?.schemaCode) {
        draftConfig.rules.validation.schemaCode = `${newService}.apply`;
      }
      if (draftConfig.rules.references) {
        draftConfig.rules.references.forEach(ref => {
          if (ref.service) {
            ref.service = newService;
          }
        });
      }
    }
    
    // Update access roles to use new module/service prefix
    if (draftConfig.access?.roles) {
      const roleTypes = ['editor', 'viewer', 'creator'];
      const oldModuleServicePrefix = `${publishedConfig.module?.toUpperCase()}_${publishedConfig.service?.toUpperCase()}`;
      
      roleTypes.forEach(roleType => {
        if (draftConfig.access.roles[roleType]) {
          draftConfig.access.roles[roleType] = draftConfig.access.roles[roleType].map(role => {
            // Replace old module/service prefix with new one
            if (role.includes(oldModuleServicePrefix)) {
              return role.replace(oldModuleServicePrefix, moduleServicePrefix);
            }
            // Keep standard roles like CITIZEN, STUDIO_ADMIN
            return role;
          });
        }
      });
    }
    
    // Update API config endpoints
    if (draftConfig.apiconfig) {
      draftConfig.apiconfig.forEach(api => {
        if (api.service) {
          api.service = newService;
        }
        if (api.endpoint) {
          api.endpoint = api.endpoint.replace(new RegExp(publishedConfig.service, 'g'), newService);
        }
      });
    }
    
    // Update workflow states and actions
    if (draftConfig.workflow?.states) {
      const oldModuleServicePrefix = `${publishedConfig.module?.toUpperCase()}_${publishedConfig.service?.toUpperCase()}`;
      
      draftConfig.workflow.states.forEach(state => {
        if (state.actions) {
          state.actions.forEach(action => {
            if (action.roles) {
              action.roles = action.roles.map(role => {
                if (role.includes(oldModuleServicePrefix)) {
                  return role.replace(oldModuleServicePrefix, moduleServicePrefix);
                }
                return role;
              });
            }
          });
        }
      });
    }
    
    // Update documents module name
    if (draftConfig.documents) {
      draftConfig.documents.forEach(doc => {
        if (doc.module) {
          doc.module = `${newModule}${newService}`;
        }
      });
    }
    
    // Update checklist state references (if any)
    if (draftConfig.checklist) {
      // Keep checklist as is, but you might want to update state names if they reference the old service
    }
    
    // Handle UI-specific configurations
    // Convert published service fields to uiforms structure
    if (publishedConfig.fields && publishedConfig.fields.length > 0) {
      // Convert fields to uiforms structure with boundary and applicant data
      draftConfig.uiforms = convertFieldsToUiforms(
        publishedConfig.fields, 
        newModule, 
        newService, 
        publishedConfig.boundary, 
        publishedConfig.applicant
      );
    } else {
      draftConfig.uiforms = [];
    }
    
    // Convert published service roles to uiroles structure
    if (publishedConfig.access && publishedConfig.access.roles) {
      draftConfig.uiroles = convertRolesToUiroles(
        publishedConfig.access, 
        publishedConfig.module, 
        publishedConfig.service, 
        newModule, 
        newService, 
        publishedConfig.workflow
      );
    } else {
      draftConfig.uiroles = [];
    }
    
    // Convert published service workflow to uiworkflow structure
    if (publishedConfig.workflow && publishedConfig.workflow.states) {
      draftConfig.uiworkflow = convertWorkflowToUiworkflow(
        publishedConfig.workflow, 
        newModule, 
        newService, 
        publishedConfig.checklist || [],
        publishedConfig.module, 
        publishedConfig.service, 
      );
    } else {
      draftConfig.uiworkflow = {};
    }
    
    // Convert published service checklist to uichecklists structure
    if (publishedConfig.checklist && publishedConfig.checklist.length > 0) {
      draftConfig.uichecklists = convertChecklistToUichecklists(publishedConfig.checklist, newModule, newService);
    } else {
      draftConfig.uichecklists = [];
    }
    
    // Convert published service notifications to uinotifications structure
    if (publishedConfig.notification) {
      draftConfig.uinotifications = convertNotificationsToUinotifications(publishedConfig.notification, newModule, newService);
    } else {
      draftConfig.uinotifications = [];
    }
    
    return draftConfig;
  };

  // Validation functions
  const validateImportData = () => {
    const errors = {};

    // Check if import data is empty
    if (!importData.trim()) {
      errors.importData = "Service configuration cannot be empty.";
      return errors;
    }

    // Check if module name is empty
    if (!importModuleName.trim()) {
      errors.moduleName = "Module name is required.";
    }

    // Check if service name is empty
    if (!importServiceName.trim()) {
      errors.serviceName = "Service name is required.";
    }

    // Validate JSON format
    try {
      const parsedData = JSON.parse(importData);
      
      // Check if it's a valid service configuration
      if (!parsedData || typeof parsedData !== 'object') {
        errors.importData = "Invalid configuration format, please paste a valid service config.";
        return errors;
      }

      // Check for required service configuration fields
      if (!parsedData.module || !parsedData.service) {
        errors.importData = "Invalid configuration format, please paste a valid service config.";
        return errors;
      }

    } catch (error) {
      errors.importData = "Invalid configuration format, please paste a valid service config.";
      return errors;
    }

    return errors;
  };

  const checkServiceExists = async (moduleName, serviceName) => {
    try {
      // Check in drafts
      const draftsResponse = await axios.post(
        "/egov-mdms-service/v2/_search",
        {
          MdmsCriteria: {
            tenantId,
            schemaCode: "Studio.ServiceConfigurationDrafts",
            limit: 100,
            offset: 0,
          },
          RequestInfo: {
            apiId: "Rainmaker",
            authToken: localStorage.getItem("Employee.token"),
            userInfo: { tenantId },
          },
        },
        { headers: { "Content-Type": "application/json;charset=UTF-8" } }
      );

      const drafts = draftsResponse.data?.mdms || [];
      const draftExists = drafts.some(draft => 
        draft?.data?.module === moduleName && draft?.data?.service === serviceName
      );

      if (draftExists) {
        return true;
      }

      // Check in published services
      const publishedResponse = await axios.get("/public-service/v1/service", {
        params: { tenantId },
        headers: {
          "X-Tenant-Id": tenantId,
          "auth-token": localStorage.getItem("Employee.token"),
        },
      });

      const publishedServices = publishedResponse.data?.Services || [];
      const publishedExists = publishedServices.some(service => 
        service?.module === moduleName && service?.businessService === serviceName
      );

      return publishedExists;
    } catch (error) {
      console.error("Error checking service existence:", error);
      return false; // Assume it doesn't exist if we can't check
    }
  };

  const handleCloseImportPopup = () => {
    setShowImportPopup(false);
    setImportData("");
    setImportModuleName("");
    setImportServiceName("");
    setImportErrors({});
    setIsImporting(false);
  };
  const handleCreateCardClick = () => {
    setShowCreatePopup(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mdmsResponse, publicServiceResponse] = await Promise.all([
          axios.post(
            "/egov-mdms-service/v2/_search",
            {
              MdmsCriteria: {
                tenantId,
                schemaCode: "Studio.ServiceConfigurationDrafts",
                limit: 10,
                offset: 0,
              },
              RequestInfo: {
                apiId: "Rainmaker",
                authToken: localStorage.getItem("Employee.token"),
                userInfo: { tenantId },
              },
            },
            { headers: { "Content-Type": "application/json;charset=UTF-8" } }
          ),
          axios.get("/public-service/v1/service", {
            params: { tenantId },
            headers: {
              "X-Tenant-Id": tenantId,
              "auth-token": localStorage.getItem("Employee.token"),
            },
          }),
        ]);

        setMdmsData(mdmsResponse.data?.mdms || []);
        setPublicServices(
          publicServiceResponse.data?.Services?.filter((ob) => ob?.status === "ACTIVE") || []
        );
      } catch (error) {
        console.error("API Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const { drafts, published } = extractDraftsAndPublished(mdmsData, publicServices);
    setCardData(buildCardData(drafts, published, t, queryStrings));
  }, [publicServices, mdmsData]);

  if (isLoading) return <Loader />;

  return (
    <Card style={{ paddingLeft: "2.5rem" }}>
      {LandingPageConfig.map((item, index) => {
        if (item.type === "SectionHeader") {
          const nextItem = LandingPageConfig[index + 1];
          const isNextToggle = nextItem?.type === "ToggleGroup";

          return (
            <div>
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                marginTop:"1.5rem"
              }}
            >
              <CardSectionHeader style={{ marginBottom: "unset" }}>
                {t(item.text)}
              </CardSectionHeader>
             {isNextToggle && <Button style={{marginRight:"3rem"}} label={t("Import")} onClick={() => setShowImportPopup(true)} />}
            </div>
             {isNextToggle && (
              <Toggle
                name="toggleOptions"
                numberOfToggleItems={nextItem?.options?.length}
                onSelect={(e) => {
                  setSelectedToggle(e);
                  setShowAllCards(false);
                }}
                style={{ maxWidth: "23.5rem" }}
                options={nextItem?.options}
                optionsKey="i18nKey"
                selectedOption={selectedToggle}
                type="toggle"
              />
            )}
            </div>
          );
        }

        if (item.type === "ToggleGroup") return null;

        if (item.type === "Header") {
          return <CardHeader key={index}>{t(item.text)}</CardHeader>;
        }

        if (item.type === "SubHeader") {
          return <CardText key={index}>{t(item.text)}</CardText>;
        }

        if (item.type === "CardGroup") {
          const cards = cardData[item?.toggleData ? selectedToggle : item?.dataKey] || [];
          const visibleCards = showAllCards ? cards : cards.slice(0, maxCardsToShow);

          return (
            <div key={index} ref={containerRef}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  justifyContent: "flex-start",
                  maxWidth: "100%",
                  marginTop: "16px",
                }}
              >
                {visibleCards.length > 0 ? (
                  visibleCards.map((card, cardIndex) => (
                    <ServiceCard
                      key={cardIndex}
                      icon={
                        card.isCreateCard ? (
                          <CustomSVG.AddIcon height="35" width="35" />
                        ) : (
                          card?.icon
                        )
                      }
                      cardHeader={card.title || (card.isCreateCard && "Add New")}
                      cardBody={card.isCreateCard ? "" : card.description}
                      createdDate={
                        card.isCreateCard ? null : card.createdDate || "01/01/2025"
                      }
                      link={card.onClick ? null : card.link}
                      onClick={card.onClick ? handleCreateCardClick : undefined}
                      className={card.isCreateCard ? "create-card" : ""}
                      module={card.module}
                      service={card.service}
                    />
                  ))
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                    {t("STUDIO_NO_CARDS_AVAILABLE")}{" "}
                    {t(`STUDIO_${selectedToggle.toUpperCase()}`)}
                  </div>
                )}
              </div>

              {cards.length > maxCardsToShow && (
                <div style={{ width: "80%", textAlign: "center", marginTop: "1rem" }}>
                  <span
                    onClick={() => setShowAllCards((prev) => !prev)}
                    style={{
                      color: "#c84c0e",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    {showAllCards ? t("STUDIO_VIEW_LESS") : t("STUDIO_VIEW_MORE")}
                  </span>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      {showCreatePopup && (
        <PopUp
          header={t("CREATE_SERVICE_GROUP")}
          headerBarMain={t("ENTER_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={() => setShowCreatePopup(false)}
          onClose={() => setShowCreatePopup(false)}
          children={[
            <div>
              <TextBlock
                header={t("CREATE_NEW_SERVICE_HEADER")}
                subHeader={t("CREATE_NEW_SERVICE_SUB_HEADER")}
                subHeaderClasName="header-popup"
                className="typography heading-m"
              />
              <div style={{ marginTop: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("MODULE_NAME")}
                  </label>
                  <TextInput
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("SERVICE_NAME")}
                  </label>
                  <TextInput
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>,
          ]}
          footerChildren={[
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                variation="secondary"
                label={t("CANCEL")}
                onClick={() => setShowCreatePopup(false)}
              />
              <Button
                variation="primary"
                label={t("PROCEED")}
                onClick={handleProceedToServiceBuilder}
                disabled={!moduleName.trim() || !serviceName.trim()}
              />
            </div>,
          ]}
        />
      )}

      {showImportPopup && (
        <PopUp
          header={t("IMPORT_SERVICE_GROUP")}
          headerBarMain={t("IMPORT_SERVICE_DETAILS")}
          actionCancelLabel={t("CANCEL")}
          actionCancelOnSubmit={handleCloseImportPopup}
          onClose={handleCloseImportPopup}
          children={[
            <div>
              <TextBlock
                header={t("IMPORT_NEW_SERVICE_HEADER")}
                subHeader={t("IMPORT_NEW_SERVICE_SUB_HEADER")}
                subHeaderClasName="header-popup"
                className="typography heading-m"
              />
              <div style={{ marginTop: "1.5rem" }}>
                {/* General error message */}
                {importErrors.general && (
                  <div style={{ 
                    color: "#d32f2f", 
                    backgroundColor: "#ffebee", 
                    padding: "0.75rem", 
                    borderRadius: "4px", 
                    marginBottom: "1rem",
                    border: "1px solid #ffcdd2"
                  }}>
                    {importErrors.general}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", minWidth: "200px" }}>
                    <label style={{ fontWeight: "500", color: "#333", marginBottom: "4px" }}>
                      {t("IMPORT_DATA")}
                    </label>
                    <Button
                      variation="teritiary"
                      label={t("DOWNLOAD_SAMPLE_JSON")}
                      onClick={() => {
                        const sampleConfig = {
                          "pdf": [
                              {
                                  "key": "tl-application",
                                  "type": "application",
                                  "states": [
                                      "applied",
                                      "approved"
                                  ]
                              },
                              {
                                  "key": "tl-bill",
                                  "type": "bill",
                                  "states": [
                                      "approved"
                                  ]
                              },
                              {
                                  "key": "tl-receipt",
                                  "type": "receipt",
                                  "states": [
                                      "approved"
                                  ]
                              }
                          ],
                          "bill": {
                              "taxHead": [
                                  {
                                      "code": "applicationFee",
                                      "name": "applicationFee",
                                      "order": "2",
                                      "isDebit": false,
                                      "service": "TESTBSONE",
                                      "category": "TAX",
                                      "isRequired": false,
                                      "isActualDemand": true
                                  }
                              ],
                              "taxPeriod": [
                                  {
                                      "code": "TEST2018",
                                      "toDate": 1554076799000,
                                      "service": "TESTBSONE",
                                      "fromDate": 1522540800000,
                                      "periodCycle": "ANNUAL",
                                      "financialYear": "2018-19"
                                  }
                              ],
                              "BusinessService": {
                                  "code": "TESTBSONE",
                                  "businessService": "TESTBSONE",
                                  "demandUpdateTime": 86400000,
                                  "isAdvanceAllowed": false,
                                  "minAmountPayable": 100,
                                  "partPaymentAllowed": true,
                                  "isVoucherCreationEnabled": true,
                                  "collectionModesNotAllowed": [
                                      "DD",
                                      "OFFLINE_NEFT",
                                      "OFFLINE_RTGS",
                                      "POSTAL_ORDER"
                                  ]
                              }
                          },
                          "idgen": [
                              {
                                  "type": "application",
                                  "format": "testui4-service5-app-[cy:yyyy-MM-dd]-[SEQ_PUBLIC_APPLICATION]",
                                  "idname": "testui4-service5.application.service5.applicationapp.id"
                              },
                              {
                                  "type": "service",
                                  "format": "testui4-service5-svc-[cy:yyyy-MM-dd]-[SEQ_PUBLIC_APPLICATION]",
                                  "idname": "testui4-service5.application.service5.applicationservice.id"
                              }
                          ],
                          "inbox": {
                              "index": "public-service-index",
                              "module": "public-service",
                              "sortBy": {
                                  "path": "Data.auditDetails.createdTime",
                                  "defaultOrder": "DESC"
                              },
                              "sourceFilterPathList": [
                                  "Data.businessService",
                                  "Data.applicationNumber",
                                  "Data.currentProcessInstance",
                                  "Data.auditDetails",
                                  "Data.additionalDetails",
                                  "Data.module",
                                  "Data.locality",
                                  "Data.status"
                              ],
                              "allowedSearchCriteria": [
                                  {
                                      "name": "tenantId",
                                      "path": "Data.tenantId.keyword",
                                      "operator": "EQUAL",
                                      "isMandatory": true
                                  },
                                  {
                                      "name": "status",
                                      "path": "Data.workflowStatus",
                                      "isMandatory": false
                                  },
                                  {
                                      "name": "applicationNumber",
                                      "path": "Data.applicationNumber.keyword",
                                      "isMandatory": false
                                  },
                                  {
                                      "name": "module",
                                      "path": "Data.module.keyword",
                                      "isMandatory": false
                                  },
                                  {
                                      "name": "businessService",
                                      "path": "Data.businessService.keyword",
                                      "isMandatory": false
                                  },
                                  {
                                      "name": "locality",
                                      "path": "Data.address.locality.keyword",
                                      "isMandatory": false
                                  },
                                  {
                                      "name": "assignee",
                                      "path": "Data.currentProcessInstance.assignes.uuid.keyword",
                                      "isMandatory": false
                                  }
                              ]
                          },
                          "rules": {
                              "registry": {
                                  "type": "api",
                                  "service": "service5"
                              },
                              "calculator": {
                                  "type": "custom",
                                  "service": "service5",
                                  "customFunction": ""
                              },
                              "references": [
                                  {
                                      "type": "initiate",
                                      "service": "service5"
                                  }
                              ],
                              "validation": {
                                  "type": "schema",
                                  "service": "service5",
                                  "schemaCode": "service5.apply",
                                  "customFunction": ""
                              }
                          },
                          "access": {
                              "roles": {
                                  "editor": [
                                      "TESTUI4_SERVICE5_UI_EDITOR"
                                  ],
                                  "viewer": [
                                      "TESTUI4_SERVICE5_VIEWER"
                                  ],
                                  "creator": [
                                      "TESTUI4_SERVICE5_CREATOR"
                                  ]
                              },
                              "actions": [
                                  {
                                      "url": "service5-services/v1/create"
                                  }
                              ]
                          },
                          "fields": [
                              {
                                  "name": "TestDetails",
                                  "type": "object",
                                  "label": "Test Details",
                                  "properties": [
                                      {
                                          "name": "Texttest",
                                          "type": "string",
                                          "label": "Text test",
                                          "format": "text",
                                          "disable": false,
                                          "tooltip": "",
                                          "helpText": "",
                                          "required": false,
                                          "orderNumber": 1,
                                          "defaultValue": "",
                                          "errorMessage": ""
                                      },
                                      {
                                          "name": "mobilenumbertest",
                                          "type": "mobileNumber",
                                          "label": "mobile number test",
                                          "format": "mobileNumber",
                                          "prefix": "+81",
                                          "disable": false,
                                          "tooltip": "",
                                          "helpText": "",
                                          "required": false,
                                          "maxLength": 256,
                                          "minLength": 0,
                                          "validation": {
                                              "regex": "^\\d{8}$",
                                              "message": "mob no is invalid"
                                          },
                                          "orderNumber": 2,
                                          "defaultValue": "",
                                          "errorMessage": "mob no is invalid"
                                      },
                                      {
                                          "name": "numberfieldtest",
                                          "type": "integer",
                                          "label": "number field test",
                                          "format": "number",
                                          "disable": false,
                                          "tooltip": "",
                                          "helpText": "",
                                          "required": false,
                                          "orderNumber": 3,
                                          "defaultValue": "",
                                          "errorMessage": ""
                                      }
                                  ]
                              }
                          ],
                          "module": "TESTUI4",
                          "enabled": [
                              "citizen",
                              "employee"
                          ],
                          "payment": {
                              "gateway": "TODO"
                          },
                          "service": "Service5",
                          "boundary": {
                              "lowestLevel": "locality",
                              "hierarchyType": "REVENUE"
                          },
                          "workflow": {
                              "ACTIVE": [],
                              "states": [
                                  {
                                      "sla": 86400000,
                                      "state": null,
                                      "actions": [
                                          {
                                              "roles": [
                                                  "TESTUI4_SERVICE5_CREATOR",
                                                  "CITIZEN",
                                                  "STUDIO_ADMIN"
                                              ],
                                              "action": "APPLY",
                                              "nextState": "PENDING_FOR_VERIFICATION"
                                          }
                                      ],
                                      "isStartState": true,
                                      "isStateUpdatable": true,
                                      "isTerminateState": false,
                                      "applicationStatus": null,
                                      "docUploadRequired": false
                                  },
                                  {
                                      "sla": 86400000,
                                      "state": "PENDING_FOR_VERIFICATION",
                                      "actions": [
                                          {
                                              "roles": [
                                                  "TESTUI4_SERVICE5_UI_EDITOR",
                                                  "CITIZEN",
                                                  "STUDIO_ADMIN"
                                              ],
                                              "action": "VERIFY",
                                              "nextState": "VERIFIED"
                                          }
                                      ],
                                      "isStartState": false,
                                      "isStateUpdatable": true,
                                      "isTerminateState": false,
                                      "applicationStatus": null,
                                      "docUploadRequired": false
                                  },
                                  {
                                      "sla": 86400000,
                                      "state": "VERIFIED",
                                      "actions": [],
                                      "isStartState": false,
                                      "isStateUpdatable": true,
                                      "isTerminateState": true,
                                      "applicationStatus": null,
                                      "docUploadRequired": false
                                  }
                              ],
                              "INACTIVE": [],
                              "business": "business",
                              "businessService": "TESTUI4.Service5",
                              "generateDemandAt": [],
                              "businessServiceSla": 5184000000,
                              "nextActionAfterPayment": "",
                              "autoTransitionEnabledStates": []
                          },
                          "apiconfig": [
                              {
                                  "host": "https://staging.digit.org",
                                  "type": "register",
                                  "method": "post",
                                  "service": "service5",
                                  "endpoint": "/service5-services/v1/create"
                              },
                              {
                                  "host": "https://staging.digit.org",
                                  "type": "search",
                                  "method": "post",
                                  "service": "service5",
                                  "endpoint": "/service5-services/v1/search"
                              }
                          ],
                          "applicant": {
                              "types": [
                                  "individual",
                                  "organisation"
                              ],
                              "config": {
                                  "systemUser": true,
                                  "systemRoles": [
                                      "CITIZEN"
                                  ],
                                  "systemUserType": "CITIZEN"
                              },
                              "maximum": 3,
                              "minimum": 1
                          },
                          "checklist": [
                              {
                                  "name": "checklist 1",
                                  "state": "PENDING_FOR_VERIFICATION",
                                  "checklistData": {
                                      "data": [
                                          {
                                              "id": "2d4a7b1e-1f2f-4a8a-9672-43396c6c9a1c",
                                              "key": 1,
                                              "type": {
                                                  "code": "SingleValueList"
                                              },
                                              "level": 1,
                                              "title": "is the check done?",
                                              "value": null,
                                              "options": [
                                                  {
                                                      "id": "0cff9846-03a2-4453-bf0e-200cdda5f390",
                                                      "key": 1,
                                                      "label": "Yes",
                                                      "subQuestions": [],
                                                      "optionComment": false,
                                                      "optionDependency": false,
                                                      "parentQuestionId": "2d4a7b1e-1f2f-4a8a-9672-43396c6c9a1c"
                                                  },
                                                  {
                                                      "id": "7161cfb2-69bc-4eb5-8623-c33ab4104f39",
                                                      "key": 2,
                                                      "label": "No",
                                                      "subQuestions": [],
                                                      "optionDependency": false,
                                                      "parentQuestionId": "2d4a7b1e-1f2f-4a8a-9672-43396c6c9a1c"
                                                  }
                                              ],
                                              "isActive": true,
                                              "parentId": null,
                                              "isRequired": false,
                                              "subQuestions": []
                                          }
                                      ],
                                      "name": "checklist 1",
                                      "isActive": true,
                                      "description": "checklist description"
                                  }
                              }
                          ],
                          "documents": [
                              {
                                  "module": "TESTUI4Service5",
                                  "actions": [
                                      {
                                          "action": "APPLY",
                                          "assignee": {
                                              "show": false,
                                              "isMandatory": false
                                          },
                                          "comments": {
                                              "show": true,
                                              "isMandatory": false
                                          },
                                          "documents": []
                                      },
                                      {
                                          "action": "VERIFY",
                                          "assignee": {
                                              "show": false,
                                              "isMandatory": false
                                          },
                                          "comments": {
                                              "show": true,
                                              "isMandatory": false
                                          },
                                          "documents": []
                                      }
                                  ],
                                  "bannerLabel": "OBPS_BANNER",
                                  "maxSizeInMB": 5,
                                  "allowedFileTypes": [
                                      "pdf",
                                      "doc",
                                      "docx",
                                      "xlsx",
                                      "xls",
                                      "jpeg",
                                      "jpg",
                                      "png"
                                  ]
                              }
                          ],
                          "calculator": {
                              "type": "custom",
                              "billingSlabs": [
                                  {
                                      "key": "applicationFee",
                                      "value": 2000
                                  }
                              ]
                          },
                          "localization": {
                              "modules": [
                                  "digit-studio"
                              ]
                          },
                          "notification": {
                              "sms": [],
                              "push": [],
                              "email": []
                          }
                      };
                        
                        const blob = new Blob([JSON.stringify(sampleConfig, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'sample-service-configuration.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      size="small"
                      style={{ 
                        fontSize: "12px",  
                        height: "auto",
                        alignSelf: "flex-start"
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextArea
                      value={importData}
                      onChange={(e) => {
                        setImportData(e.target.value);
                        // Clear error when user starts typing
                        if (importErrors.importData) {
                          setImportErrors(prev => ({ ...prev, importData: null }));
                        }
                      }}
                      placeholder={t("PASTE_YOUR_SERVICE_CONFIGURATION_JSON_HERE")}
                      style={{ 
                        minHeight: "200px",
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        borderColor: importErrors.importData ? "#d32f2f" : undefined
                      }}
                    />
                    {importErrors.importData && (
                      <div style={{ 
                        color: "#d32f2f", 
                        fontSize: "12px", 
                        marginTop: "4px" 
                      }}>
                        {importErrors.importData}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("IMPORTMODULE_NAME")}
                  </label>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      value={importModuleName}
                      onChange={(e) => {
                        setImportModuleName(e.target.value);
                        // Clear error when user starts typing
                        if (importErrors.moduleName) {
                          setImportErrors(prev => ({ ...prev, moduleName: null }));
                        }
                      }}
                      style={{ 
                        borderColor: importErrors.moduleName ? "#d32f2f" : undefined
                      }}
                    />
                    {importErrors.moduleName && (
                      <div style={{ 
                        color: "#d32f2f", 
                        fontSize: "12px", 
                        marginTop: "4px" 
                      }}>
                        {importErrors.moduleName}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <label style={{ minWidth: "200px", fontWeight: "500", color: "#333" }}>
                    {t("IMPORT_SERVICE_NAME")}
                  </label>
                  <div style={{ flex: 1 }}>
                    <TextInput
                      value={importServiceName}
                      onChange={(e) => {
                        setImportServiceName(e.target.value);
                        // Clear error when user starts typing
                        if (importErrors.serviceName) {
                          setImportErrors(prev => ({ ...prev, serviceName: null }));
                        }
                      }}
                      style={{ 
                        borderColor: importErrors.serviceName ? "#d32f2f" : undefined
                      }}
                    />
                    {importErrors.serviceName && (
                      <div style={{ 
                        color: "#d32f2f", 
                        fontSize: "12px", 
                        marginTop: "4px" 
                      }}>
                        {importErrors.serviceName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <AlertCard label={t("IMPORT_INFO")} text={t("IMPORT_INFO_DEFINITION")} />
            </div>,
          ]}
          footerChildren={[
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                variation="secondary"
                label={t("CANCEL")}
                onClick={handleCloseImportPopup}
                disabled={isImporting}
              />
              <Button
                variation="primary"
                label={isImporting ? "Importing..." : t("IMPORT")}
                onClick={handleImportService}
                disabled={
                  isImporting || 
                  !importModuleName.trim() || 
                  !importServiceName.trim() || 
                  !importData.trim() ||
                  Object.keys(importErrors).length > 0
                }
              />
            </div>,
          ]}
        />
      )}
    </Card>
  );
};

export default LandingPage;
