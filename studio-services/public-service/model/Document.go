package model

// Document represents a file or record attached to a transaction.
type Document struct {
	ID                string       `json:"id,omitempty" validate:"max=64"`          // System ID of the document
	DocumentType      string       `json:"documentType,omitempty"`                  // Unique document type code
	FileStoreID       string       `json:"fileStoreId,omitempty"`                   // File store reference key
	DocumentUID       string       `json:"documentUid,omitempty" validate:"max=64"` // Unique ID of the document (e.g., Aadhaar, PAN)
	AdditionalDetails interface{}  `json:"additionalDetails,omitempty"`             // JSON object for additional info
	AuditDetails      AuditDetails `json:"auditDetails,omitempty" validate:"-"`     // Audit details
}

// Equal checks if two Document structs are equal.
func (d Document) Equal(other Document) bool {
	return d.ID == other.ID &&
		d.DocumentType == other.DocumentType &&
		d.FileStoreID == other.FileStoreID &&
		d.DocumentUID == other.DocumentUID
}
