import React from "react";
import { Card, TextBlock, Button, Loader } from "@egovernments/digit-ui-components";
import { transformViewApplication } from "../utils/createUtils";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

const CheckListCard = (props) => {
    const [filled, setFilled] = useState(false);
    const [loading, setLoading] = useState(false);
    const tenantId = Digit.ULBService.getCurrentTenantId();
    const history = useHistory();

    const style = {
        display: "flex",
        alignItems: "center",
        gap: "1rem"
    };

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

    const isFilled = async (id, accid) => {

        await mutation.mutate(
            {
                url: '/health-service-request/service/v1/_search',
                method: "POST",
                body: transformViewApplication(id, accid,tenantId),
                config: {
                    enable: false,
                },
            },
            {
                onSuccess: (res) => {
                    let field = res.Services.filter(items => items.serviceDefId == id);
                    const allValid = field?.[0]?.additionalFields[0].action=="SUBMIT";
                    if (field && field.length > 0) {
                        setFilled(allValid);
                    }
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
        isFilled(props.item.id, props.accid)
    }, [props.item.id, props.accid]);

    return (
        <div>
            {loading ? (
                <Card type="primary" style={style}>
                    <TextBlock body={props.t(props.item.code)} />
                    {filled ? (
                        <Button label="View Response" onClick={() => 
                            history.push({ 
                                pathname:`/${window.contextPath}/employee/publicservices/viewresponse?accid=${props.accid}&id=${props.item.id}&code=${props.item.code}`,
                                state:{
                                    cardItems:props.item,
                                },
                            })
                        } />
                    ) : (
                        <Button label="Fill Checklist" onClick={() => history.push(`/${window.contextPath}/employee/publicservices/checklist?accid=${props.accid}&id=${props.item.id}&code=${props.item.code}`, { redirectionUrl : `${window.location.href}`,})} />
                    )}
                </Card>
            ) : (
                <Loader />
            )}
        </div>
    );
};

export default CheckListCard;