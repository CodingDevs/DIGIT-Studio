import React from "react";

export const CreateCheckListConfig = (item) => {
    let response = item[0];
    const createConfig = (field, label, codes, hide) => {
        let type = field.dataType === "SingleValueList" ? "radio" : "text";
        if (type == "radio") {
            return {
                isMandatory: field.required,
                key: field.code,
                type: type,
                label: `${label}.${codes}`,
                disable: false,
                populators: {
                    name: field.code,
                    optionsKey: "name",
                    hideInForm: hide,
                    alignVertical: true,
                    options: field.values?.slice(0, -1).map(item => ({
                        code: item,
                        name: `${label}.${item}`,
                    }))
                },
            }
        }
        else {
            return {
                isMandatory: field.required,
                key: field.code,
                type: type,
                label: `${label}.${codes}`,
                disable: false,
                populators: {
                    name: field.code,
                    hideInForm: false,
                    alignVertical: true,
                },
            }
        }
    };
    let config = [];
    let fields = response.attributes;
    fields.forEach(item => {
        const codeParts = item.code.split(".");
        if (codeParts.length === 1) {
            config.push(createConfig(item, response.code, item.code, false));
        }
        else {
            config.push(createConfig(item, response.code, item.code, true));
        }
    });
    return [
        {
            body: config
        }
    ];
}

export const updateCheckListConfig = (config, values) => {
    config[0].body.forEach(item => {
        const part = item.key.split(".");
        if (part.length > 1) {
            const code = part[0];
            const value = part[part.length - 2];
            const selectedValue = values[code]?.code || values[code];
            if (values[code] && selectedValue === value && item.populators.hideInForm == true) {
                item.populators.hideInForm = false;
            }
            if (values[code] && selectedValue !== value && item.populators.hideInForm == false) {
                item.populators.hideInForm = true;
            }
        }
    });
    return config;
}

export default CreateCheckListConfig;