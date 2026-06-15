import { Order } from "@/lib/types";

interface ReceiptProps {
  order: Order;
  taxRate: number;
}

export default function Receipt({ order, taxRate }: ReceiptProps): string {
  const items = order.items
    .map(
      (item) =>
        `<tr>
          <td style="text-align:left">${item.name} x${item.quantity}</td>
          <td style="text-align:right">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${order.id.slice(0, 8)}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 20px;
          font-size: 14px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .total { font-size: 18px; font-weight: bold; }
        @media print {
          body { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2 style="margin:0">Cafe POS</h2>
        <p style="margin:5px 0">Receipt</p>
      </div>
      <hr>
      <p>Order: #${order.id.slice(0, 8).toUpperCase()}</p>
      <p>Date: ${new Date(order.paid_at || order.created_at).toLocaleString()}</p>
      ${order.table_number ? `<p>Table: ${order.table_number}</p>` : ""}
      <hr>
      <table>${items}</table>
      <hr>
      <table>
        <tr>
          <td>Subtotal</td>
          <td style="text-align:right">$${order.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Tax (${taxRate}%)</td>
          <td style="text-align:right">$${order.tax.toFixed(2)}</td>
        </tr>
        <tr class="total">
          <td>Total</td>
          <td style="text-align:right">$${order.total.toFixed(2)}</td>
        </tr>
      </table>
      <hr>
      <table>
        <tr>
          <td>Payment</td>
          <td style="text-align:right">${order.payment_type === "cash" ? "Cash" : "Credit"}</td>
        </tr>
        ${
          order.payment_type === "cash"
            ? `<tr>
                <td>Received</td>
                <td style="text-align:right">$${order.amount_received.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Change</td>
                <td style="text-align:right">$${order.change_amount.toFixed(2)}</td>
              </tr>`
            : `<tr>
                <td>Ref #</td>
                <td style="text-align:right">${order.payment_ref || ""}</td>
              </tr>`
        }
      </table>
      <hr>
      <div class="center">
        <p>Thank you!</p>
      </div>
    </body>
    </html>
  `;
}
