package model

type DocumentRequest struct {
    Code                string        `json:"code"`
    Name                interface{}   `json:"name"`
    Active              interface{}   `json:"active"`
    HintText            string        `json:"hintText"`
    IsMandatory         interface{}   `json:"isMandatory"`
    MaxSizeInMB         interface{}   `json:"maxSizeInMB"`
    ShowHintBelow       bool          `json:"showHintBelow"`
    ShowTextInput       bool          `json:"showTextInput"`
    TemplatePDFKey      interface{}   `json:"templatePDFKey"`
    MaxFilesAllowed     interface{}   `json:"maxFilesAllowed"`
    AllowedFileTypes    interface{}   `json:"allowedFileTypes"`
    TemplateDownloadURL interface{}   `json:"templateDownloadURL"`
}