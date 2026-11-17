export type FieldType = "text" | "tel" | "email" | "date" | "select" | "file";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  approval?: boolean;
  readOnly?: boolean;
}

export interface Group {
  id: string;
  title: string;
  fields: FieldDef[];
}

interface Base {
  id: string;
  title: string;
  sub: string;
  cat: string;
  icon: string;
}

export interface KVSection extends Base {
  kind: "kv";
  groups: Group[];
}

export interface ListSection extends Base {
  kind: "list";
  addLabel: string;
  fields: FieldDef[];
}

export type ProfileSection = KVSection | ListSection;

const field = (
  key: string,
  label: string,
  options: Partial<FieldDef> = {},
): FieldDef => ({ key, label, ...options });

const addressFields = (prefix: string, approval: boolean) =>
  ["Address Line 1", "Address Line 2", "Address Line 3", "City", "District", "State", "Pincode"].map((label) =>
    field(`${prefix}.${label.toLowerCase().replace(/ /g, "")}`, label, { approval }),
  );

const relations = ["Father", "Mother", "Spouse", "Sibling", "Child"];

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "personal",
    kind: "kv",
    title: "Personal Details",
    sub: "Identity and personal records",
    cat: "personal",
    icon: "user",
    groups: [{
      id: "personal",
      title: "Personal",
      fields: [
        field("p.marital", "Marital Status", { type: "select", options: ["Unmarried", "Married", "Divorced", "Widowed"] }),
        field("p.father", "Father / Spouse Name", { approval: true }),
        field("p.religion", "Religion"),
        field("p.caste", "Caste"),
        field("p.tongue", "Mother Tongue"),
        field("p.cug", "CUG Mobile No", { type: "tel" }),
        field("p.cityBirth", "City of Birth", { approval: true }),
        field("p.countryBirth", "Country of Birth", { approval: true }),
        field("p.nationality", "Nationality", { approval: true }),
        field("p.community", "Community"),
        field("p.officialEmail", "Official Email", { readOnly: true }),
        field("p.retirement", "Retirement Age", { readOnly: true }),
        field("p.qualification", "Highest Qualification"),
        field("p.blood", "Blood Group", { type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }),
        field("p.height", "Height"),
        field("p.weight", "Weight"),
      ],
    }],
  },
  {
    id: "contact",
    kind: "kv",
    title: "Contact & Emergency",
    sub: "Direct channels and emergency contacts",
    cat: "contact",
    icon: "phone",
    groups: [
      {
        id: "contact",
        title: "Contact",
        fields: [
          field("c.mobile", "Mobile No", { type: "tel", approval: true }),
          field("c.mobile2", "Mobile No 2", { type: "tel" }),
          field("c.email", "Email ID", { type: "email", readOnly: true }),
        ],
      },
      {
        id: "emergency",
        title: "Emergency contact",
        fields: [
          field("e.no", "Emergency Contact No", { type: "tel" }),
          field("e.no2", "Emergency Contact No 2", { type: "tel" }),
          field("e.name", "Contact Name"),
          field("e.relation", "Relation"),
          field("e.address", "Address"),
        ],
      },
    ],
  },
  {
    id: "dates",
    kind: "kv",
    title: "Important Dates",
    sub: "Joining, birth and celebration dates",
    cat: "dates",
    icon: "calendar",
    groups: [{
      id: "dates",
      title: "Dates",
      fields: [
        field("d.doj", "Date of Join", { type: "date", readOnly: true }),
        field("d.dob", "Date of Birth", { type: "date", approval: true }),
        field("d.bday", "Birthday (For Wishes)", { type: "date" }),
      ],
    }],
  },
  {
    id: "address",
    kind: "kv",
    title: "Address Details",
    sub: "Permanent and communication address",
    cat: "details",
    icon: "pin",
    groups: [
      { id: "permanent", title: "Permanent address", fields: addressFields("pa", true) },
      { id: "communication", title: "Communication address", fields: addressFields("ca", false) },
    ],
  },
  {
    id: "bank",
    kind: "kv",
    title: "Bank Account",
    sub: "Salary credit account",
    cat: "details",
    icon: "bank",
    groups: [{
      id: "bank",
      title: "Bank",
      fields: [
        field("b.name", "Bank Name", { approval: true }),
        field("b.branch", "Branch Name", { approval: true }),
        field("b.account", "Account No", { approval: true }),
        field("b.ifsc", "IFSC Code", { approval: true }),
      ],
    }],
  },
  {
    id: "family",
    kind: "list",
    title: "Family Members",
    sub: "Dependents and family records",
    cat: "family",
    icon: "family",
    addLabel: "Add member",
    fields: [
      field("name", "Name"),
      field("relation", "Relation", { type: "select", options: relations }),
      field("gender", "Gender", { type: "select", options: ["Male", "Female", "Other"] }),
      field("type", "Member Type", { type: "select", options: ["Dependent", "Non-dependent"] }),
    ],
  },
  {
    id: "nominee",
    kind: "list",
    title: "Nominee Details",
    sub: "Nominees for benefits",
    cat: "family",
    icon: "family",
    addLabel: "Add nominee",
    fields: [
      field("name", "Nominee Name"),
      field("relation", "Relation", { type: "select", options: relations }),
      field("share", "Share %"),
    ],
  },
  {
    id: "proof",
    kind: "list",
    title: "Address / Identity Proof",
    sub: "Uploaded proof documents",
    cat: "docs",
    icon: "folder",
    addLabel: "Add proof",
    fields: [
      field("title", "Title", { type: "select", options: ["Aadhaar", "PAN", "Passport", "Voter ID", "Driving Licence"] }),
      field("proof", "Proof", { type: "file" }),
    ],
  },
  {
    id: "prior",
    kind: "list",
    title: "Prior Work Experience",
    sub: "Previous employers",
    cat: "qualification",
    icon: "briefcase",
    addLabel: "Add experience",
    fields: [
      field("org", "Previous Org"),
      field("designation", "Designation"),
      field("from", "From Date", { type: "date" }),
      field("to", "To Date", { type: "date" }),
      field("attachment", "Attachment", { type: "file" }),
    ],
  },
  {
    id: "profileImage",
    kind: "list",
    title: "Profile Photo",
    sub: "Your display picture",
    cat: "profile",
    icon: "camera",
    addLabel: "Upload photo",
    fields: [field("image", "Profile Image", { type: "file" })],
  },
];
