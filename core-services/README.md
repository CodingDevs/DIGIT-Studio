# 🚀 DIGIT Studio ( Service Delivery Framework )

The **DIGIT Service Delivery Framework** is a **low-code/no-code** platform built to help government agencies and partners **rapidly design, configure, and deploy** digital public services—such as trade licenses, permits, and grievance redressals—with **minimal engineering effort**.

It builds on top of the proven DIGIT Core Platform and enables the rollout of fully functional digital services through **configuration** (no code) and **extensions** (code where needed).

---

# Customized DIGIT Core Services

This directory contains a set of customized services based on [DIGIT Core 2.9 LTS](https://core.digit.org/), tailored specifically for DIGIT Studio needs. While DIGIT Core provides a robust and modular platform, certain enhancements and overrides were necessary to meet specific functional requirements.

To maintain better separation and manageability of these changes, we maintain the overridden services here.

---

## 🔧 Customized Services

The following core services have been overridden:

- **Workflow**  
  Enhanced or modified to support custom state transitions and business-specific workflows.

- **Inbox**  
  Customized to allow tailored filters, sorting mechanisms, and role-based view enhancements.

- **Service Request**  
  Adjusted to accommodate specific validations, request handling rules, or integration behavior unique to DIGIT Studio.

- **Individual**  
  Extended to support additional attributes or customized identity resolution strategies.

---

## 📚 Reference Documentation

- DIGIT Core Documentation: [https://core.digit.org/](https://core.digit.org/)
- DIGIT Core GitHub Repository: [https://github.com/egovernments/Digit-Core/](https://github.com/egovernments/Digit-Core/)

---

## 🛠 Compatibility

These services are built on top of **DIGIT Core 2.9 LTS**, and may not be directly compatible with later versions without adaptation.

---

## 📂 Directory Structure

Each service in this directory follows the structure of its core counterpart, allowing for easier comparison and migration when core updates are available.

---

## 📝 Notes

- All custom logic or changes made to the original services are documented inline for transparency and ease of maintenance.
- It is recommended to keep this customized directory in sync with the upstream DIGIT Core for future compatibility and security updates.

---


## 🤝 Contributing
  Contributions are welcome! Please refer to the contributing guide for guidelines on submitting issues or pull requests.

## 📬 Contact
  For any questions or support, reach out to [jagankumar](https://github.com/jagankumar-egov)

## 🛡️ License
  This project is licensed under the MIT License. See the LICENSE file for details.

