const PDFDocument = require("pdfkit");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const download = require("image-downloader");

exports.handler = async (event) => {
  const data = event;

  const pdfDoc = new PDFDocument({ size: "A4", margin: 50 });
  
  await generateHeader(pdfDoc);
  generateCustomerInformation(pdfDoc, data);
  generateInvoiceTable(pdfDoc, data);
  generateFooter(pdfDoc);

  const pdfBuffer = await new Promise((resolve, reject) => {
    const buffers = [];
    pdfDoc.on('data', buffers.push.bind(buffers));
    pdfDoc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    pdfDoc.end();
  });

  const timestamp = new Date().toISOString().replace(/:/g, '-'); 
  const fileName = `boleta_${timestamp}.pdf`; // Para que todos los pdf se llamen distinto

  try {
    const params = {
      Bucket: 'boletasvuelos',
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    };

    await s3.upload(params).promise();
    const url = `https://boletasvuelos.s3.amazonaws.com/${fileName}`;
    return `Boleta generada exitosamente. Puedes verla aquí: ${url}`;

  } catch (error) {
    console.error('Error al subir el PDF a S3:', error);
    throw error;
  }

};

async function generateHeader(doc) {

    const logoUrl = "https://boletasvuelos.s3.us-east-2.amazonaws.com/logo.jpg";
    const options = {
        url: logoUrl,
        dest: '/tmp/logo.jpg' // Save to /tmp directory in Lambda environment
      };
      
      try {
        const { filename } = await download.image(options);
        console.log("Imagen descargada en: ", filename);
        doc
        .image(filename, 40, 0, { width: 160})
        .fillColor("#444444")
        .fontSize(10)
        .text("VuelosNicolás", 200, 50, { align: "right" })
        .text("Av. Vicuña Mackenna 4686", 200, 65, { align: "right" })
        .text("Macul, Santiago de Chile", 200, 80, { align: "right" })
        .moveDown();

    } catch (error) {
        console.error("Error downloading the image: ", error);
      }
  }
  
  function generateCustomerInformation(doc, invoice) {
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("Boleta electrónica", 50, 160);
  
    generateHr(doc, 185);
  
    const customerInformationTop = 200;
  
    doc
      .fontSize(10)
  
      .font("Helvetica-Bold")
      .text("Datos del pasajero:", 50, customerInformationTop)
  
      .font("Helvetica")
      .text(invoice.name, 50, customerInformationTop + 15)
      .text(invoice.email, 50, customerInformationTop + 30)
  
      .font("Helvetica-Bold")
      .text("Fecha actual:", 300, customerInformationTop)
      .font("Helvetica")
      .text(formatDate(new Date()), 400, customerInformationTop)
      .font("Helvetica-Bold")
      .text("Fecha de compra:", 300, customerInformationTop + 15)
      .font("Helvetica")
      .text(invoice.fecha_compra, 400, customerInformationTop + 15)
  
      .moveDown();
  
    generateHr(doc, 267);
  }
  
  function generateInvoiceTable(doc, invoice) {
  
    doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("Detalles del vuelo", 50, 300, { align: "left" });
  
    const invoiceTableTop = 330;
  
    doc.font("Helvetica-Bold");
    generateTableRow5(
      doc,
      invoiceTableTop,
      "Origen",
      "Destino",
      "Duración",
      "Fecha",
      "Hora"
    );
  
    generateHr(doc, invoiceTableTop + 20);
  
    doc.font("Helvetica");
    generateTableRow5(
      doc,
      invoiceTableTop + 30,
      invoice.origen,
      invoice.destino,
      invoice.duracion,
      invoice.fecha,
      invoice.hora,
    );
  
    generateHr(doc, invoiceTableTop + 50);
  
    doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("Datos del billete", 50, 410, { align: "left" });
  
    // Segunda fila de información
    const invoiceTableMiddle = 440;
  
    doc.font("Helvetica-Bold");
    generateTableRow4(
      doc,
      invoiceTableMiddle,
      "Id viaje",
      "Aerolínea",
      "Costo",
      "Cantidad",
    );
  
    generateHr(doc, invoiceTableMiddle + 20);
  
    doc.font("Helvetica");
    generateTableRow4(
      doc,
      invoiceTableMiddle + 30,
      invoice.id_viaje,
      invoice.aerolinea,
      formatCurrency(invoice.precio),
      invoice.cantidad
    );
  
    generateHr(doc, invoiceTableMiddle + 50);
  
    const duePosition = invoiceTableMiddle + 80;
    doc.font("Helvetica-Bold");
    generateTableRow4(
      doc,
      duePosition,
      "",
      "",
      "Total a pagar",
      formatCurrency(invoice.precio * invoice.cantidad)
    );
    doc.font("Helvetica");
  }
  
  
  function generateFooter(doc) {
    doc
      .fontSize(10)
      .text(
        "Muchas gracias por confiar en nosotros.",
        50,
        780,
        { align: "center", width: 500 }
      );
  }
  
  
  function generateTableRow4(
      doc,
      y,
      id_viaje,
      aerolinea,
      precio,
      cantidad
    ) {
      doc
        .fontSize(10)
        .text(id_viaje, 50, y)
        .text(aerolinea, 150, y)
        .text(precio, 280, y, { width: 90, align: "right" })
        .text(cantidad, 0, y, {align: "right" })
    }
  
  
  function generateTableRow5(
      doc,
      y,
      origen,
      destino,
      duracion,
      fecha,
      hora,
    ) {
      doc
        .fontSize(10)
        .text(origen, 50, y)
        .text(destino, 180, y)
        .text(duracion, 300, y)
        .text(fecha, 370, y)
        .text(hora, 0, y, { align: "right" })
    }
  
  
  function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }
  
  function formatCurrency(cents) {
    return "$" + cents ;
  }
  
  function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
  
    return day + "/" + + month + "/" + year;
  }
  