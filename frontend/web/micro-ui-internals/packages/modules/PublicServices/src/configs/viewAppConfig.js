
export const ViewApplicationConfig = (response,code,t,cardItems) => {
    const values = response?.attributes?.map(attr => {
        const matchingItem = cardItems?.attributes?.find(a => a?.code == attr?.attributeCode);
        const isSingleValueList = matchingItem?.dataType === "SingleValueList";
        return {
            key: `${code}.${attr.attributeCode}`,
            value: isSingleValueList ? t(`${code}.${attr.value}`) : attr.value
        };
    });

    const config = {
        cards: [
            {
                sections: [
                    {
                        type: "DATA",
                        cardHeader: { value: "View Application", inlineStyles: { marginTop: "2rem" } },
                        values: values
                    },
                ],
            },
        ],
        apiResponse: response,
        additionalDetails: {},
    };
    return config;
}

export default ViewApplicationConfig;
