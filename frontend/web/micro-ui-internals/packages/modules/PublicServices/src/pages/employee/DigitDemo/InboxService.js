import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { InboxConfig } from "../../../configs/inboxGenericConfig";
import { InboxSearchComposer, Loader } from "@egovernments/digit-ui-components";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getParallelWorkflow } from "../../../utils";

const InboxService = () => {
  const { t } = useTranslation();
  const { module } = useParams();
  const tenantId = Digit.ULBService.getCurrentTenantId();

  const [servicesData, setServicesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // To fetch the generic inbox config for inboxSearchComposer
  const configs = InboxConfig();

  //fetch all the services configured for the tenant
  useEffect(() => {
    const fetchBusinessServices = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get("/public-service/v1/service", {
          params: { tenantId: tenantId },
          headers: {
            "X-Tenant-Id": tenantId,
            "auth-token" : window?.localStorage?.getItem("Employee.token"),
          },
        });

        const services = response?.data?.Services || [];
        setServicesData(services);
      } catch (error) {
        console.error("Error fetching business services:", error);
        setServicesData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessServices();
  }, [tenantId]);

  //To fetch the service configurations of the services
  const requestCriteria = {
    url: "/egov-mdms-service/v2/_search",
    body: {
      MdmsCriteria: {
        tenantId: tenantId,
        schemaCode: "Studio.ServiceConfiguration",
        filters:{
          module: module,
        }
      },
    },
  };

  const { isLoading: moduleListLoading, data } = Digit.Hooks.useCustomAPIHook(requestCriteria);

  // Preprocess and inject dynamic values into config
  const updatedConfig = useMemo(() => {
    return Digit.Utils.preProcessMDMSConfigInboxSearch(
      t,
      configs,
      "sections.search.uiConfig.fields",
      {
        updateDependent: [
          {
            key: "businessService",
            value: servicesData.filter((ob) => ob?.module?.toLowerCase() === module?.toLowerCase()).map((ob) => ({
              code: ob?.businessService,
              name: ob?.businessService,
              parallelWorkflow: getParallelWorkflow(module, ob?.businessService, data?.mdms),
              workflowBusinessService : data?.mdms?.filter((mdms) => mdms?.uniqueIdentifier?.toLowerCase() === `${module}.${ob?.businessService}`.toLowerCase())?.[0]?.data?.workflow?.businessService,
            })),
          },
        ],
      }
    );
  }, [t, configs, servicesData,data]);

  if (isLoading || moduleListLoading) return <Loader />;

  return (
    <React.Fragment>
      <div className="digit-inbox-search-wrapper">
        <InboxSearchComposer configs={updatedConfig} />
      </div>
    </React.Fragment>
  );
};

export default InboxService;
