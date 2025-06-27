import React from "react";
import { Card, TextBlock, Button } from "@egovernments/digit-ui-components";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import transformViewCheckList from "../../../utils/createUtils.js"
import CheckListCard from "../../../components/CheckListCard.js";
import { useTranslation } from "react-i18next";

const ViewCheckListCards = ({checkListCodes, applicationId}) => {
    const { t } = useTranslation();

    const code = checkListCodes;
    //businessService.workflowstate
    //applicationid
    const accountID = applicationId;
    const [cardItems, setCardItems] = useState([]);

    const request = {
        url: "/health-service-request/service/definition/v1/_search",
        params: {},
        body: {},
        method: "POST",
        headers: {},
        config: {
            enable: false,
        },
    }
    const mutation = Digit.Hooks.useCustomAPIMutationHook(request);

    const getcarditems = async (code) => {
        await mutation.mutate(
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
                    setCardItems(res?.ServiceDefinitions);
                },
                onError: () => {
                    console.log("Error occured");
                },
            }
        )
    }

    useEffect(() => {
        getcarditems(code);
    }, []);

    return (
        <React.Fragment>
            {
                cardItems.map((item, index) => (
                    <CheckListCard item={item} t={t} accid={accountID} />
                ))
            }
        </React.Fragment>
    );
};

export default ViewCheckListCards;