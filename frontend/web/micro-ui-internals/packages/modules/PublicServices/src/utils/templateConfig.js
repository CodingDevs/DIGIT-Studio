export const AddressFields = [
    {
      "name": "address",
      "label": "Address ",
      "type": "object",
        "properties": [
          {
            "name": "pincode",
            "label": "Pincode ",
            "disable" : false,
            "type": "string",
            "format": "number",
            "maxLength": 6,
            "minLength": 0,
            "validation": {
              "regex": "^[1-9][0-9]{5}$",
              "message": "Only 6 numbers allowed",
              "maxLength": 6,
              "minLength": 0,
            },
            "required": false,
            "orderNumber": 1
          },
          {
            "key": "city",
            "type": "boundary",
            "name":"city",
            "inline": true,
            "label": "city",
            "disable": false,
            "populators": {
                "name":"city",
                "levelConfig": {lowestLevel:"LOCALITY",highestLevel:"LOCALITY", isSingleSelect:["LOCALITY"]} ,
                "hierarchyType": window?.location.href.includes("unified-uat")? "ADMIN" : "NEWTEST00222" ,
                "noCardStyle":true,
                layoutConfig: {
                  // isDropdownLayoutHorizontal: true,
                  // isLabelFieldLayoutHorizontal: true,
                  isLabelNotNeeded:true
                },
                //"preSelected":["NEWTEST00222_MO","NEWTEST00222_MO_11_MARYLAND","NEWTEST00222_MO_11_06_PLEEBO"],
                
                // "frozenData":
                // [{
                //     code: "NEWTEST00222_MO",
                //     name: "NEWTEST00222_MO"
                //   },
                //   {
                //     code: "NEWTEST00222_MO.NEWTEST00222_MO_11_MARYLAND",
                //     name: "NEWTEST00222_MO_11_MARYLAND"
                //   },
                //   {
                //     code: "NEWTEST00222_MO.NEWTEST00222_MO_11_MARYLAND.NEWTEST00222_MO_11_06_PLEEBO",
                //     name: "NEWTEST00222_MO_11_06_PLEEBO"
                //   }]
            },
          },
          // {
          //   "name": "city",
          //   "label": "City ",
          //   "disable" : false,
          //   "defaultValue" : "DEV",
          //   "prefix": "CITY",
          //   "type": "string",
          //   "format": "radioordropdown",
          //   "required": false,
          // },
          {
            "name": "streetName",
            "label": "Street Name ",
            "disable" : false,
            "type": "string",
            "format": "text",
            "maxLength": 256,
            "minLength": 0,
            "validation": {
              "regex": "^[a-zA-Z0-9\\s\\.,\\-\\/]*$",
              "message": "Invalid street name format"
            },
            "required": false,
            "orderNumber": 1
          },
        ]
    }
  ]

export const ApplicantFields =  [{
    "name": "applicantDetails",
    "label": "Applicant Details ",
    // "type": "array",
    // "items":{
      "type": "object",
      "properties": [
        {
          "name": "name",
          "label": "Owner Name ",
          "disable" : false,
          "type": "string",
          "format": "text",
          "maxLength": 256,
          "minLength": 0,
          "validation": {
            "regex": "^[a-zA-Z\\s]*$",
            "message": "Only alphabetic characters allowed"
          },
          "required": false,
          "orderNumber": 1
        },
        {
          "name": "mobileNumber",
          "label": "Mobile Number ",
          "disable" : false,
          "type": "mobileNumber",
          "format": "mobileNumber",
          "maxLength": 256,
          "minLength": 0,
          "validation": {
            "regex": "^[6-9]\\d{9}$",
            "message": "Only 9 numbers allowed"
          },
          "prefix":"+253",
          // "populators":{
          //   hideSpan:false
          // },
          "required": false,
          "orderNumber": 1
        },
        {
          "name": "email",
          "label": "Email",
          "disable" : false,
          "type": "string",
          "format": "text",
          "maxLength": 256,
          "minLength": 0,
          "validation": {
            "regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            "message": "email format not valid"
          },
          "required": false,
          "orderNumber": 1
        },
        {
          "name": "gender",
          "label": "Gender ",
          "disable" : false,
          "type": "string",
          "format": "radioordropdown",
          "reference": "mdms",
          "required": false,
          "schema": "common-masters.GenderType" 
        },
      ]
    //}
  }]

export const documentFields = [
  {
    "head": "documents",
    "body": [
        {
            "type": "documentUploadAndDownload",
            "withoutLabel": true,
            "mdmsModuleName": "DigitStudio",
            "module": "TradeLicense.NewTL",
            "error": "WORKS_REQUIRED_ERR",
            "name": "uploadedDocs",
            "populators": {
                "name": "uploaded",
                "action": "APPLY"  
            },
            //"customClass": "input-emp",
            "localePrefix": "TL_DOC"
        }
    ]
  }
]