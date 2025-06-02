import { AddressFields } from "./templateConfig";
import { ApplicantFields } from "./templateConfig";
import { documentFields } from "./templateConfig";

export const generateFormConfig = (config, module, service) => {
  const serviceFields = config?.ServiceConfiguration?.[0]?.fields || [];

  const sortByOrderNumber = (fields = []) =>
    [...fields].sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));

  const createField = (field) => {
    return {
      type: field.format || field.type,
      label: `${module}_${service}_${field.name.toUpperCase()}`,
      populators: {
        ...field?.populators,
        name: field.name,
        optionsKey: "name",
        error: field?.validation?.message || "field is required",
        required: !!field.required,
        validation: field.validation,
        disable: field.disable,
        defaultValue: field.defaultValue,
        prefix: field.prefix,
        reference: field.reference,
        dependencies: field.dependencies,
        ...(field?.schema
          ? {
              mdmsConfig: {
                masterName: field.schema.split(".")[1] || "Master",
                moduleName: field.schema.split(".")[0] || "common-masters",
                localePrefix: `${field?.schema.replaceAll(".","_").toUpperCase()}_${field.name.toUpperCase()}`,
              },
            }
          : {}),
          ...(field?.type === "enum"
            ? {
                options: field?.values?.map((ob) => ({"code" : ob.toUpperCase(), name: `${module}_${service}_${field.name.toUpperCase()}_${ob.toUpperCase()}`})),
              }
            : {}),
        ...(field?.defaultValue
          ? {
              options: [
                {
                  code: field.defaultValue,
                  name: `TRADELICENSE_${field?.name.toUpperCase()}_${field.defaultValue}`,
                },
              ],
            }
          : {}),
      },
    };
  };

  let dynamicStep = 1;

  const createChildForm = (objectField) => {
    return {
      head: `${module}_${service}_${objectField.name.toUpperCase()}`,
      name: objectField.name,
      body: sortByOrderNumber(objectField.properties).map((subField) => createField(subField)),
      type: "childform",
      step: dynamicStep++,
    };
  };

  const createMultiChildForm = (arrayField) => {
    return {
      head: `${module}_${service}_${arrayField.name.toUpperCase()}`,
      name: arrayField.name,
      type: "multiChildForm",
      prefix: `${module}_${service}`,
      body: sortByOrderNumber(arrayField.items.properties).map((subField) => createField(subField)),
      step: dynamicStep++,
    };
  };

  const getDocumentFields = (documentField) => {
    return {
      head: `${module}_${service}_${documentField.head.toUpperCase()}`,
      "type": "documents",
      body: [{...documentField?.body?.[0], localePrefix: `${module.toUpperCase()}_${service.toUpperCase()}_${documentField.head.toUpperCase()}`}],
     
    };
  };

  const basicFields = [];
  const stepForms = [];

  sortByOrderNumber(serviceFields).forEach((field) => {
    if (field.type === "object") {
      stepForms.push(createChildForm(field));
    } else if (field.type === "array") {
      stepForms.push(createMultiChildForm(field));
    } else {
      basicFields.push(createField(field));
    }
  });

  const addressFieldsStep =
    config?.ServiceConfiguration?.[0]?.boundary && AddressFields?.[0]
      ? AddressFields[0].type === "object"
        ? createChildForm(AddressFields[0])
        : createMultiChildForm(AddressFields[0])
      : {};

  const applicantFieldsStep =
    config?.ServiceConfiguration?.[0]?.applicant && ApplicantFields?.[0]
      ? ApplicantFields[0].type === "array"
        ? createMultiChildForm(ApplicantFields[0])
        : createChildForm(ApplicantFields[0])
      : {};

  const steps = [];

  if (basicFields.length > 0) {
    steps.push({
      head: "Service Details",
      body: basicFields,
      type: "form",
    });
  }

  const documentform =
    config?.ServiceConfiguration?.[0]?.documents && documentFields?.[0]
      ? getDocumentFields(documentFields[0])
      : {};

  return [...steps, ...stepForms, applicantFieldsStep, addressFieldsStep, documentform];
};
