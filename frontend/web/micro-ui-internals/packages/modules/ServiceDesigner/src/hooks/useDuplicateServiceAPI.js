import { useMutation } from "react-query";
import { useTranslation } from "react-i18next";

const mdms_context_path = window?.globalConfigs?.getConfig("MDMS_V2_CONTEXT_PATH") || "mdms-v2";

/**
 * Custom hook for duplicating service configurations using Studio.ServiceConfigurationDrafts
 */
export const useDuplicateServiceAPI = () => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();

  /**
   * Recursively replace all occurrences of old module/service with new ones in an object
   */
  const replaceModuleServiceInObject = (obj, oldModule, oldService, newModule, newService) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => replaceModuleServiceInObject(item, oldModule, oldService, newModule, newService));
    }

    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Replace in string values
        let newValue = value;
        newValue = newValue.replace(new RegExp(oldModule, 'gi'), newModule);
        newValue = newValue.replace(new RegExp(oldService, 'gi'), newService);
        newObj[key] = newValue;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        newObj[key] = replaceModuleServiceInObject(value, oldModule, oldService, newModule, newService);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  };

  /**
   * Fetch service configuration draft by module and service
   */
  const fetchServiceConfig = useMutation({
    mutationFn: async ({ module, service }) => {
      const searchPayload = {
        MdmsCriteria: {
          tenantId: tenantId,
          schemaCode: "Studio.ServiceConfigurationDrafts",
          filters: {
            module: module,
            service: service,
          },
        },
      };

      const response = await Digit.CustomService.getResponse({
        url: `/${mdms_context_path}/v2/_search`,
        params: { tenantId: tenantId },
        body: searchPayload,
      });

      return response?.mdms?.[0];
    },
    onError: (error) => {
      console.error("Error fetching service config:", error);
      throw error;
    },
  });

  /**
   * Duplicate service configuration with new module and service names
   */
  const duplicateServiceConfig = useMutation({
    mutationFn: async ({ originalModule, originalService, newModule, newService }) => {
      // First, fetch the original configuration
      const originalConfig = await fetchServiceConfig.mutateAsync({
        module: originalModule,
        service: originalService,
      });

      if (!originalConfig) {
        throw new Error("Original service configuration not found");
      }


      // Replace all occurrences of original module/service with new ones in the entire configuration
      const updatedConfig = replaceModuleServiceInObject(
        originalConfig, 
        originalModule, 
        originalService, 
        newModule, 
        newService
      );


      // Create new configuration with updated module and service names
      const newConfig = {
        ...updatedConfig,
        id: undefined, // Remove ID to create new entry
        uniqueIdentifier: `${newModule}_${newService}`,
        data: {
          ...updatedConfig.data,
          module: newModule,
          service: newService,
        },
        auditDetails: {
          createdBy: Digit.UserService.getUser()?.info?.uuid,
          createdTime: Date.now(),
          lastModifiedBy: Digit.UserService.getUser()?.info?.uuid,
          lastModifiedTime: Date.now(),
        },
      };

      // Create new service configuration draft
      const createPayload = {
        Mdms: {
          tenantId: tenantId,
          schemaCode: "Studio.ServiceConfigurationDrafts",
          data: newConfig.data,
        },
      };
      const response = await Digit.CustomService.getResponse({
        url: `/${mdms_context_path}/v2/_create/Studio.Checklists`,
        params: { tenantId: tenantId },
        body: createPayload,
      });

      return response;
    },
    onError: (error) => {
      console.error("Error duplicating service config:", error);
      throw error;
    },
  });

  return {
    fetchServiceConfig,
    duplicateServiceConfig,
  };
}; 