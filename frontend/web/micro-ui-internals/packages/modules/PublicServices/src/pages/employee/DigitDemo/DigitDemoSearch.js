import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useSearchGenericConfig } from "../../../configs/searchGenericConfig";
import { InboxSearchComposer, Loader } from "@egovernments/digit-ui-components";

const DigitDemoSearch = () => {
  const { t } = useTranslation();
  const tenantId = Digit.ULBService.getCurrentTenantId();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  //To fetch the dynamic search config
  const configs = useSearchGenericConfig(setIsLoading); 

  // Fetch service data from API when component mounts or tenantId changes
  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        const response = await axios.get("/public-service/v1/service", {
          params: { tenantId : tenantId },
          headers: {
            "X-Tenant-Id": tenantId,
            "auth-token" : window?.localStorage?.getItem("Employee.token"),
          },
        });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching service data:", error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceData();
  }, [tenantId]);

  // Preprocess and inject dynamic values into config
  const updatedConfig = useMemo(() => {
    if (!configs || !data) return null;
    const services = data?.Services || [];

    return Digit.Utils.preProcessMDMSConfigInboxSearch(
      t,
      configs,
      "sections.search.uiConfig.fields",
      {
        updateDependent: [
          {
            key: "businessService",
            value: services.map((s) => ({
              code: s.businessService,
              name: s.businessService,
              serviceCode: s.serviceCode,
            })),
          },
        ],
      }
    );
  }, [t, configs, data]
  );

  if (!updatedConfig || isLoading) {
    return <Loader />;
  }

  return (
    <div className="digit-inbox-search-wrapper">
      <InboxSearchComposer configs={updatedConfig} />
    </div>
  );
};

export default DigitDemoSearch;
