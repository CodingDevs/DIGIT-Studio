import { useMutation, useQuery } from "react-query";
import { useTranslation } from "react-i18next";

const mdms_context_path = window?.globalConfigs?.getConfig("MDMS_V2_CONTEXT_PATH") || "mdms-v2";

/**
 * Custom hook for form configuration API operations
 */
export const useFormConfigAPI = () => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();

  /**
   * Save form configuration to MDMS (using CustomService like checklist)
   */
  const saveFormConfig = useMutation(
    async (formData) => {
      const payload = {
        Mdms: {
          tenantId: tenantId,
          schemaCode: "Studio.Forms",
          data: formData,
        },
      };
      const response = await Digit.CustomService.getResponse({
        url: `/${mdms_context_path}/v2/_create/Studio.Checklists`,
        params: { tenantId: tenantId },
        body: payload,
      });
      return response;
    },
    {
      onError: (error) => {
        console.error("Error saving form config:", error);
        throw error;
      },
    }
  );

  /**
   * Update existing form configuration in MDMS (using CustomService like checklist)
   */
  const updateFormConfig = useMutation(
    async (formData) => {
      const payload = {
        Mdms: {
         ...formData
        },
      };
      const response = await Digit.CustomService.getResponse({
        url: `/${mdms_context_path}/v2/_update/Studio.Checklists`,
        params: { tenantId: tenantId },
        body: payload,
      });
      return response;
    },
    {
      onError: (error) => {
        console.error("Error updating form config:", error);
        throw error;
      },
    }
  );

  /**
   * Search form configurations by module and service
   */
  const searchFormConfigs = (module, service) => {
    return useQuery(
      ["formConfigs", module, service],
      async () => {
        const payload = {
          MdmsCriteria: {
            tenantId: tenantId,
            schemaCode: "Studio.Forms",
            isActive: true,
            filters: {
              module: module,
              service: service,
            },
          },
        };

        const response = await Digit.CustomService.getResponse({
          url: `/${mdms_context_path}/v2/_search`,
          params: { tenantId: tenantId },
          body: payload,
        });

        return response?.mdms || [];
      },
      {
        enabled: !!module && !!service,
        cacheTime: 5 * 60 * 1000, // 5 minutes
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    );
  };

  /**
   * Search form configuration by unique identifier (module.service)
   */
  const searchFormConfigById = (module, service) => {
    return useQuery(
      ["formConfig", module, service],
      async () => {
        const payload = {
          MdmsCriteria: {
            tenantId: tenantId,
            schemaCode: "Studio.Forms",
            isActive: true,
            filters: {
              module: module,
              service: service,
            },
          },
        };
        const response = await Digit.CustomService.getResponse({
          url: `/${mdms_context_path}/v2/_search`,
          params: { tenantId: tenantId },
          body: payload,
        });
        return response?.mdms?.[0] || null;
      },
      {
        enabled: !!module && !!service,
        cacheTime: 5 * 60 * 1000, // 5 minutes
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    );
  };

  /**
   * Fetch form configuration by formName for edit mode
   */
  const fetchFormConfigByName = (formName) => {
    return useQuery(
      ["formConfigByName", formName],
      async () => {
        const payload = {
          MdmsCriteria: {
            tenantId: tenantId,
            schemaCode: "Studio.Forms",
            isActive: true,
            filters: {
              "formName": formName,
            },
          },
        };
        const response = await Digit.CustomService.getResponse({
          url: `/${mdms_context_path}/v2/_search`,
          params: { tenantId: tenantId },
          body: payload,
        });
        return response?.mdms?.[0] || null;
      },
      {
        enabled: !!formName,
        cacheTime: 5 * 60 * 1000, // 5 minutes
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    );
  };

  /**
   * Delete form configuration
   */
  const deleteFormConfig = useMutation(
    async (formData) => {
      const payload = {
        MdmsCriteria: {
          tenantId: tenantId,
          schemaCode: "Studio.FormConfig",
          data: {
            ...formData,
            isActive: false,
          },
        },
      };

      const response = await Digit.Request({
        url: `/${mdms_context_path}/v2/_update`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": Digit.UserService.getUser()?.access_token,
        },
        body: payload,
      });

      return response;
    },
    {
      onError: (error) => {
        console.error("Error deleting form config:", error);
        throw error;
      },
    }
  );

  return {
    saveFormConfig,
    updateFormConfig,
    searchFormConfigs,
    searchFormConfigById,
    fetchFormConfigByName,
    deleteFormConfig,
  };
};

/**
 * Utility function to transform form data to MDMS format
 */
export const transformFormDataToMDMS = (formState, module, service, formName, formDescription = "") => {
  const currentDate = new Date().toISOString();
  const user = Digit.UserService.getUser();

  // Clean the form data to ensure no localization keys are stored
  const cleanFormData = {
    ...formState,
    screenData: formState?.screenData?.map(screen => ({
      ...screen,
      cards: screen?.cards?.map(card => ({
        ...card,
        headerFields: card?.headerFields?.map(headerField => ({
          ...headerField,
          // Ensure we store the actual value, not a localization key
          value: typeof headerField.value === 'string' ? headerField.value : headerField.value || ''
        })),
        fields: card?.fields?.map(field => ({
          ...field,
          // Ensure we store the actual label, not a localization key
          label: typeof field.label === 'string' ? field.label : field.label || '',
          // Ensure other text fields are also stored as plain text
          helpText: typeof field.helpText === 'string' ? field.helpText : field.helpText || '',
          innerLabel: typeof field.innerLabel === 'string' ? field.innerLabel : field.innerLabel || '',
          tooltip: typeof field.tooltip === 'string' ? field.tooltip : field.tooltip || '',
          errorMessage: typeof field.errorMessage === 'string' ? field.errorMessage : field.errorMessage || '',
          defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : field.defaultValue || ''
        }))
      }))
    }))
  };

  return {
    module: module,
    service: service,
    formName: formName,
    formDescription: formDescription,
    version: "1.0.0",
    isActive: true,
    formConfig: {
      screens: cleanFormData?.screenData || [],
    },
    // Remove localization data completely - we don't need it
     localization: {},
  };
};

/**
 * Utility function to transform MDMS data to form format
 */
export const transformMDMSToFormData = (mdmsData) => {
  if (!mdmsData) return null;

  return {
    screenData: mdmsData.formConfig?.screens || [],
    localization: mdmsData.localization || {},
    metadata: {
      module: mdmsData.module,
      service: mdmsData.service,
      formName: mdmsData.formName,
      version: mdmsData.version,
      createdDate: mdmsData.createdDate,
      lastModifiedDate: mdmsData.lastModifiedDate,
      createdBy: mdmsData.createdBy,
    },
  };
}; 