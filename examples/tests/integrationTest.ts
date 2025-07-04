import {
  createDocumentSubmissionItemFromInvoice,
  CreateInvoiceDocumentParams,
  IdentificationScheme,
  MyInvoisClient,
  MyInvoisEnvironment,
  SubmitDocumentsRequest,
  SubmitDocumentsResponse,
} from "myinvois-client"; // Adjust path

// --- Main Test Function ---
async function runFullIntegrationTest() {
  console.log(
    "Starting Full Integration Test for MyInvoisClient (Invoice 1.0)..."
  );

  const CLIENT_ID = process.env.SANDBOX_CLIENT_ID ?? "your_sandbox_client_id";
  const CLIENT_SECRET =
    process.env.SANDBOX_CLIENT_SECRET ?? "your_sandbox_client_secret";
  const ENVIRONMENT: MyInvoisEnvironment = "SANDBOX";
  const SUPPLIER_TIN = process.env.SANDBOX_SUPPLIER_TIN ?? "EI00000000010";
  const SUPPLIER_IDENTIFICATION_NUMBER =
    process.env.SANDBOX_SUPPLIER_IDENTIFICATION_NUMBER ?? "202001234567";
  const SUPPLIER_IDENTIFICATION_SCHEME =
    process.env.SANDBOX_CUSTOMER_IDENTIFICATION_SCHEME ?? "BRN";
  const CUSTOMER_TIN = process.env.SANDBOX_CUSTOMER_TIN ?? "EI00000000010";
  const CUSTOMER_IDENTIFICATION_NUMBER =
    process.env.SANDBOX_CUSTOMER_IDENTIFICATION_NUMBER ?? "202001234567";
  const CUSTOMER_IDENTIFICATION_SCHEME =
    process.env.SANDBOX_CUSTOMER_IDENTIFICATION_SCHEME ?? "BRN";
  if (
    CLIENT_ID === "your_sandbox_client_id" ||
    CLIENT_SECRET === "your_sandbox_client_secret"
  ) {
    console.warn(
      "Please replace with actual SANDBOX credentials to run this test against the API."
    );
    // return;
  }

  const myInvoiceClient = new MyInvoisClient(
    CLIENT_ID,
    CLIENT_SECRET,
    ENVIRONMENT
  );

  try {
    console.log("\nStep 1: Authenticating as taxpayer...");
    const accessToken =
      await myInvoiceClient.auth.loginAsTaxpayer("InvoicingAPI");
    console.log(
      "Authentication successful. Token (first 20 chars):",
      accessToken.substring(0, 20) + "..."
    );

    console.log(
      "\nStep 2: Constructing UBL Invoice JSON using createUblJsonInvoiceDocument (Version 1.0)..."
    );
    const currentDate = new Date();
    const issueDateStr = currentDate.toISOString().split("T")[0];
    const issueTimeStr = currentDate.toISOString().substring(11, 16) + ":00Z";
    const invoiceId = `TEST-INV10-${Date.now()}`;

    // return;
    // Populate CreateInvoiceDocumentParams
    const invoiceParams: CreateInvoiceDocumentParams = {
      id: invoiceId,
      issueDate: issueDateStr,
      issueTime: issueTimeStr,
      documentCurrencyCode: "MYR",
      taxCurrencyCode: "MYR",
      supplier: {
        legalName: "Test Supplier Sdn. Bhd.",
        address: {
          cityName: "Kuala Lumpur",
          postalZone: "50000",
          countrySubentityCode: "14", // Assuming MalaysianStateCode for W.P. Kuala Lumpur
          countryCode: "MYS",
          addressLines: ["Street 1", "Area"],
        },
        TIN: SUPPLIER_TIN,
        identificationNumber: SUPPLIER_IDENTIFICATION_NUMBER,
        identificationScheme:
          SUPPLIER_IDENTIFICATION_SCHEME as IdentificationScheme,
        telephone: "+60123456789",
        industryClassificationCode: "46510",
        industryClassificationName:
          "Wholesale of computer hardware, software and peripherals",
      },
      customer: {
        legalName: "Test Customer Bhd.",
        address: {
          cityName: "Petaling Jaya",
          postalZone: "46000",
          countrySubentityCode: "10", // Assuming MalaysianStateCode for Selangor
          countryCode: "MYS",
          addressLines: ["Customer Street 1", "Customer Area"],
        },
        TIN: CUSTOMER_TIN,
        identificationNumber: CUSTOMER_IDENTIFICATION_NUMBER,
        identificationScheme:
          CUSTOMER_IDENTIFICATION_SCHEME as IdentificationScheme,
        telephone: "+60123456789",
      },
      taxTotal: {
        totalTaxAmount: 1.0,
        taxSubtotals: [
          {
            taxableAmount: 10.0,
            taxAmount: 1.0,
            taxCategoryCode: "01", // Assuming TaxTypeCode
            percent: 10,
          },
        ],
      },
      legalMonetaryTotal: {
        lineExtensionAmount: 10.0,
        taxExclusiveAmount: 10.0,
        taxInclusiveAmount: 11.0,
        payableAmount: 11.0,
      },
      invoiceLines: [
        {
          id: "1",
          quantity: 1,
          unitPrice: 10.0,
          unitCode: "UNT",
          subtotal: 10.0,
          itemDescription: "Test Item",
          itemCommodityClassification: {
            code: "001", // Assuming ClassificationCode
            listID: "CLASS",
          },
          lineTaxTotal: {
            taxAmount: 1.0,
            taxSubtotals: [
              {
                taxableAmount: 10.0,
                taxAmount: 1.0,
                taxCategoryCode: "01", // Assuming TaxTypeCode
                percent: 10,
              },
            ],
          },
        },
      ],
      // Note: For Invoice 1.0, ublExtensions and signatureId/Method are not used by the helper
      // and will be omitted from the generated JSON.
    };

    const documentToSubmit =
      await createDocumentSubmissionItemFromInvoice(invoiceParams);

    const submissionRequest: SubmitDocumentsRequest = {
      documents: [documentToSubmit],
    };

    console.log("\nStep 4 : Submitting Document to MyInvois API..."); // Renumbering step
    const submissionResponse: SubmitDocumentsResponse =
      await myInvoiceClient.documents.submitDocuments(submissionRequest);
    console.log(
      "Submission Response:",
      JSON.stringify(submissionResponse, null, 2)
    );
    if (
      submissionResponse.acceptedDocuments &&
      submissionResponse.acceptedDocuments.length > 0
    ) {
      console.log("\nTEST SUCCEEDED (API ACCEPTED THE DOCUMENT CONCEPTUALLY)");
      console.log(
        "Accepted Document UUID:",
        submissionResponse.acceptedDocuments[0].uuid
      );
    } else if (
      submissionResponse.rejectedDocuments &&
      submissionResponse.rejectedDocuments.length > 0
    ) {
      console.error("\nTEST FAILED (API REJECTED THE DOCUMENT):");
      console.error(
        "Rejection Details:",
        JSON.stringify(submissionResponse.rejectedDocuments, null, 2)
      );
    } else {
      console.warn(
        "\nTEST UNCERTAIN (NO CLEAR ACCEPTANCE/REJECTION IN RESPONSE)"
      );
    }
  } catch (error) {
    console.error("\n--- ERROR IN TEST EXECUTION ---");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      const e = error as any;
      if (e.response?.data) {
        console.error(
          "Error details:",
          JSON.stringify(e.response.data, null, 2)
        );
      } else if (e.error?.errorCode) {
        console.error("Error details:", JSON.stringify(e.error, null, 2));
      } else {
        console.error("Full error object:", error);
      }
    } else {
      console.error("An unknown error occurred:", error);
    }

    console.log("-----------------------------");
  } finally {
    console.log("\nFull Integration Test Completed.");
  }
}

runFullIntegrationTest().catch((e) => {
  console.log(e);
});
