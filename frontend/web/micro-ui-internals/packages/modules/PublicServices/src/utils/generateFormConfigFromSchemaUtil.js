// Importing field groups for different sections of the form
import { AddressFields } from "./templateConfig";
import { ApplicantFields } from "./templateConfig";
import { documentFields } from "./templateConfig";

// Main function to generate form config from service config, module, and service names
export const generateFormConfig = (config, module, service) => {
  // Extract fields from the first ServiceConfiguration object
  const serviceFields = config?.ServiceConfiguration?.[0]?.fields || [];

  // Utility to sort fields by their orderNumber property
  const sortByOrderNumber = (fields = []) =>
    [...fields].sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));

  // Generates a single field configuration object
  const createField = (field) => {
    return {
      type: field.format || field.type, // Use `format` if available, else fallback to `type`
      label: `${module}_${service}_${field.name.toUpperCase()}`, // Internationalized label
      isMandatory: !!field.required,
      populators: {
        ...field?.populators, // Spread additional populators if provided
        name: field.name.replace(/[\s\S]/g, ""),
        optionsKey: "name",
        error: field?.validation?.message || "field is required",
        required: !!field.required,
        validation:{
          minlength:field?.minLength,
          maxlength:field?.maxLength,
          pattern: new RegExp(field?.validation?.regex),
          message: field?.validation?.message
        },
        disable: field.disable,
        defaultValue: field.defaultValue,
        prefix: field.prefix,
        reference: field.reference,
        dependencies: field.dependencies,
        hideSpan:true,

        // Handle MDMS-based schema loading
        ...(field?.schema
          ? {
              mdmsConfig: {
                masterName: field.schema.split(".")[1] || "Master",
                moduleName: field.schema.split(".")[0] || "common-masters",
                localePrefix: `${field?.schema.replaceAll(".", "_").toUpperCase()}_${field.name.toUpperCase()}`,
              },
            }
          : {}),

        // Handle enum values if type is `enum`
        ...(field?.type === "enum"
          ? {
              options: field?.values?.map((ob) => ({
                code: ob.toUpperCase(),
                name: `${module}_${service}_${field.name.toUpperCase()}_${ob.toUpperCase()}`
              })),
            }
          : {}),

        // Add default option if defaultValue is present
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

  let dynamicStep = 1; // Counter to track and increment step numbers for each form section

  // Create configuration for an object type field (child form)
  const createChildForm = (objectField) => {
    return {
      head: `${module}_${service}_${objectField.name.toUpperCase()}`,
      name: objectField.name,
      body: sortByOrderNumber(objectField.properties).map((subField) => createField(subField)),
      type: "childform",
      step: dynamicStep++,
    };
  };

  // Create configuration for an array type field (multi-entry child form)
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

  // Create document upload form section
  const getDocumentFields = (documentField) => {
    return {
      head: `${module}_${service}_${documentField.head.toUpperCase()}`,
      type: "documents",
      body: [{
        ...documentField?.body?.[0],
        localePrefix: `${module.toUpperCase()}_${service.toUpperCase()}_${documentField.head.toUpperCase()}`
      }],
    };
  };

  const basicFields = []; // Flat fields not nested in object/array
  const stepForms = [];   // Sections with child forms

  // Organize service fields into either flat fields or nested sections
  sortByOrderNumber(serviceFields).forEach((field) => {
    if (field.type === "object") {
      stepForms.push(createChildForm(field));
    } else if (field.type === "array") {
      stepForms.push(createMultiChildForm(field));
    } else {
      basicFields.push(createField(field));
    }
  });

  // Conditionally add address section if config and AddressFields exist
  const addressFieldsStep =
    config?.ServiceConfiguration?.[0]?.boundary && AddressFields?.[0]
      ? AddressFields[0].type === "object"
        ? createChildForm(AddressFields[0])
        : createMultiChildForm(AddressFields[0])
      : {};

  // Conditionally add applicant section
  const applicantFieldsStep =
    config?.ServiceConfiguration?.[0]?.applicant && ApplicantFields?.[0]
      ? ApplicantFields[0].type === "array"
        ? createMultiChildForm(ApplicantFields[0])
        : createChildForm(ApplicantFields[0])
      : {};

  const steps = [];

  // Push flat field group as a top-level section if any exist
  if (basicFields.length > 0) {
    steps.push({
      head: `${module}_${service}_DETAILS`,
      body: basicFields,
      type: "form",
    });
  }

  // Conditionally add document section
  const documentform =
    config?.ServiceConfiguration?.[0]?.documents?.[0]?.actions?.[0]?.documents.length > 0 && documentFields?.[0]
      ? getDocumentFields(documentFields[0])
      : {};

  // Final return — combine all dynamic sections
  return [...steps, ...stepForms, applicantFieldsStep, addressFieldsStep, documentform];
};
