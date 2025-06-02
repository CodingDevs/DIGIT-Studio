import React from "react";
import { Card, TextBlock, Button, Loader } from "@egovernments/digit-ui-components";
import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { transformViewApplication } from "../../../utils/createUtils";
import ViewApplicationConfig from "../../../configs/viewAppConfig";
import { ViewComposer } from "@egovernments/digit-ui-react-components";
import { useTranslation } from "react-i18next";

const ViewApplication = () => {
    const queryStrings = Digit.Hooks.useQueryParams();
    const accid=queryStrings?.accid;
    const id=queryStrings?.id;
    const code=queryStrings?.code;
    const [config, setConfig] = useState([]);
    const [loading, setLoading] = useState(false);
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const {t} = useTranslation();

    const request = {
        url: "/health-service-request/service/v1/_search",
        params: {},
        body: {},
        method: "POST",
        headers: {},
        config: {
            enable: false,
        },
    }
    const mutation = Digit.Hooks.useCustomAPIMutationHook(request);

    const getapp = async (id, accid) => {
        await mutation.mutate(
            {
                url: '/health-service-request/service/v1/_search',
                method: "POST",
                body: transformViewApplication(id, accid, tenantId),
                config: {
                    enable: false,
                },
            },
            {
                onSuccess: (res) => {
                    let field = res?.Services?.filter(items => items.serviceDefId == id);
                    setConfig(ViewApplicationConfig(field?.[0],code,t));
                    setLoading(true);
                },
                onError: () => {
                    console.log("Error checking filled status");
                    setLoading(true);
                },
            }
        )
    }

    useEffect(() => {
        getapp(id, accid);
    }, []);

    if ( !loading){
        return <Loader/>
    }
    
    return (
        <div>
            {ViewComposer && config ? <ViewComposer data={config} /> : <div>Loading View...</div>}
        </div>
    );
};

export default ViewApplication;