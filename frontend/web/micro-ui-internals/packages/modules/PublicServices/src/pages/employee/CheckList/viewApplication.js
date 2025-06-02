import React from "react";
import { Card, TextBlock, Button, Loader } from "@egovernments/digit-ui-components";
import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { transformViewApplication } from "../../../utils/createUtils";
import ViewApplicationConfig from "../../../configs/viewAppConfig";
import transformViewCheckList from "../../../utils/createUtils";
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
    const [cardItems, setCardItems] = useState([]);
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

    const def_search_request = {
        url: "/health-service-request/service/definition/v1/_search",
        params: {},
        body: {},
        method: "POST",
        headers: {},
        config: {
            enable: false,
        },
    }
    const smutation = Digit.Hooks.useCustomAPIMutationHook(def_search_request);

    const getcarditems = async (code) => {
        await smutation.mutate(
            {
                url: "/health-service-request/service/definition/v1/_search",
                method: "POST",
                body: transformViewCheckList(code),
                config: {
                    enable: false,
                },
            },
            {
                onSuccess: (res) => {
                    console.log(res, "application_response");
                    setCardItems(res?.ServiceDefinitions || []);
                },
                onError: () => {
                    console.log("Error occurred");
                    setCardItems([]);
                },
            }
        )
    }

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
                    let field = res.Services.filter(items => items.serviceDefId == id);
                    setConfig(ViewApplicationConfig(field[0],code, t, cardItems));
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
        getcarditems([code]);
    }, [code]);

    useEffect(() => {
        if (cardItems && cardItems.length > 0) {
            getapp(id, accid);
        }
    }, [cardItems]);

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