import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors()); // Allows your frontend to talk to this backend
app.use(express.json());

app.post('/api/get-grades', async (req, res) => {
  const pxpSoapUrl = 'https://md-mcps-psv.edupoint.com/Service/PXPCommunication.asmx';

  // Log incoming request for debugging
  console.log('Incoming /api/get-grades request body:', JSON.stringify(req.body));

  // Construct your XML using data from the frontend request body
  const pxpSoapXml11 = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n` +
    `  <soap:Body>\n` +
    `    <ProcessWebServiceRequestMultiWeb xmlns="http://edupoint.com/webservices/">\n` +
    `      <userID>${req.body.userID}</userID>\n` +
    `      <password>${req.body.password}</password>\n` +
    `      <skipLoginLog>1</skipLoginLog>\n` +
    `      <parent>0</parent>\n` +
    `      <webDBName />\n` +
    `      <webServiceHandleName>PXPWebServices</webServiceHandleName>\n` +
    `      <methodName>${req.body.methodName}</methodName>\n` +
    // Wrap paramStr in CDATA to preserve any embedded XML/angles
    `      <paramStr>${req.body.paramStr}></paramStr>\n` +
    `    </ProcessWebServiceRequestMultiWeb>\n` +
    `  </soap:Body>\n` +
    `</soap:Envelope>`;

  // Log outgoing XML (truncated) so you can inspect it without overwhelming logs
  console.log('Outgoing SOAP XML (truncated to 2000 chars):\n', pxpSoapXml11.slice(0, 2000));

  try {
    // In Node.js, fetch WILL preserve your custom User-Agent and exact header casing!
    const response = await fetch(pxpSoapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://edupoint.com/webservices/ProcessWebServiceRequestMultiWeb',
        'User-Agent': 'StudentVUE/1.9.16 CFNetwork/3860.500.112 Darwin/25.4.0'
      },
      body: pxpSoapXml11
    });

    const xmlText = await response.text();

    // Log upstream response for debugging
    console.log('Upstream SOAP response status:', response.status);
    // Build a plain object from headers safely
    const headerObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    console.log('Upstream SOAP response headers:', headerObj);
    console.log('Upstream SOAP response body (truncated to 2000 chars):\n', xmlText.slice(0, 2000));

    res.set('Content-Type', 'text/xml');
    res.status(response.status).send(xmlText);
  } catch (err) {
    console.error('Proxy request failed', err && (err as Error).stack ? (err as Error).stack : err);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`Backend proxy running on port ${port}`));
