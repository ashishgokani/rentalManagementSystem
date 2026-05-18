import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    User as UserIcon,
    Loader2,
    Save,
    DollarSign
} from 'lucide-react';
import { quotationsApi, Quotation, QuotationLine } from '../../api/quotations';
import { ordersApi } from '../../api/orders';
import { productsApi } from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { QuotationStatus, RentalPeriodSelection } from '../../types';

const statusColors: Record<string, string> = {
    draft: 'badge-neutral',
    sent: 'badge-info',
    requested: 'badge-warning',
    reviewed: 'badge-primary',
    accepted: 'badge-success',
    rejected: 'badge-danger',
    expired: 'badge-neutral',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
    ordered: 'badge-neutral',
};

export default function QuotationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Edited values for Vendor
    const [editedLines, setEditedLines] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await quotationsApi.getQuotation(id);
            setQuotation(data);

            // Initialize edited prices
            const prices: Record<string, number> = {};
            data.lines.forEach(line => {
                prices[line.id] = line.unitPrice;
            });
            setEditedLines(prices);
        } catch (err: any) {
            setError(err.message || 'Failed to load quotation');
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (lineId: string, price: number) => {
        setEditedLines(prev => ({
            ...prev,
            [lineId]: price
        }));
    };

    const calculateLineTotal = (line: QuotationLine, unitPrice: number) => {
        return unitPrice * line.quantity;
    };

    const calculateTotal = () => {
        if (!quotation) return 0;
        return quotation.lines.reduce((sum, line) => {
            const price = editedLines[line.id] ?? line.unitPrice;
            return sum + calculateLineTotal(line, price);
        }, 0);
    };

    const handleVendorSubmit = async () => {
        if (!quotation) return;
        if (!confirm('Submit updated quotation to customer?')) return;

        try {
            setProcessing(true);
            const linesUpdate = quotation.lines.map(line => ({
                id: line.id,
                unitPrice: editedLines[line.id],
                total_price: calculateLineTotal(line, editedLines[line.id])
            }));

            await quotationsApi.updateQuotation(quotation.id, {
                status: 'sent',
                lines: linesUpdate
            });

            fetchQuotation();
            alert('Quotation submitted successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to submit quotation');
        } finally {
            setProcessing(false);
        }
    };

    const handleUserResponse = async (accept: boolean) => {
        if (!quotation) return;
        const action = accept ? 'accept' : 'reject';
        if (!confirm(`Are you sure you want to ${action} this quotation?`)) return;

        try {
            setProcessing(true);
            await quotationsApi.updateQuotation(quotation.id, {
                status: accept ? 'confirmed' : 'draft'
            });
            fetchQuotation();
            if (accept) {
                alert('Quotation accepted! You can now proceed to create an order.');
            }
        } catch (err: any) {
            alert(err.message || `Failed to ${action} quotation`);
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!quotation) return;

        try {
            setProcessing(true);

            // We need to fetch product details to get vendorId for each item
            // Since orders are per-vendor, we might need to split this quotation into multiple orders
            // For MVP, if we assume single vendor or just pick the first product's vendor:

            // 1. Group lines by Vendor
            const linesWithProduct = await Promise.all(quotation.lines.map(async (line) => {
                const product = await productsApi.getProduct(line.productId);
                // Use logic to get vendorId. API returns vendorId.
                return { ...line, vendorId: product.vendorId };
            }));

            const ordersByVendor: Record<string, typeof linesWithProduct> = {};
            linesWithProduct.forEach(line => {
                if (!ordersByVendor[line.vendorId]) {
                    ordersByVendor[line.vendorId] = [];
                }
                ordersByVendor[line.vendorId].push(line);
            });

            // 2. Create Order for each vendor
            const createdOrders = [];
            for (const [vendorId, lines] of Object.entries(ordersByVendor)) {
                const orderData = {
                    quotationId: quotation.id,
                    vendorId: vendorId,
                    lines: lines.map(line => ({
                        productId: line.productId,
                        quantity: line.quantity,
                        rental_period: {
                            type: line.rental_period_type,
                            startDate: line.rental_start_date,
                            endDate: line.rental_end_date,
                            quantity: line.quantity
                        },
                        unitPrice: line.unitPrice,
                        total_price: line.total_price
                    })),
                    security_deposit: 0,
                };

                // @ts-ignore - Ignore type mismatch for OrderCreate
                const order = await ordersApi.createOrder(orderData);
                createdOrders.push(order);
            }

            alert(`Successfully created ${createdOrders.length} order(s)!`);
            // Navigate to payment page for the first order
            if (createdOrders.length === 1) {
                navigate(`/orders/${createdOrders[0].id}/pay`);
            } else {
                // If multiple orders, let them find them in the list to pay
                navigate('/orders');
            }

        } catch (err: any) {
            alert(err.message || 'Failed to create order');
        } finally {
            setProcessing(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price);
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
    if (error || !quotation) return <div className="text-center py-12 text-red-600">{error || 'Not found'}</div>;

    const isVendor = user?.role?.toUpperCase() === 'VENDOR' || user?.role?.toUpperCase() === 'ADMIN';
    const isCustomer = user?.role?.toUpperCase() === 'CUSTOMER';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/quotations')}
                    className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-primary-900">{quotation.quotation_number}</h1>
                    <p className="text-primary-500">Quotation Details</p>
                </div>
                <span className={`badge ${statusColors[quotation.status.toLowerCase()]} capitalize`}>
                    {quotation.status}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6">
                        <h3 className="font-semibold text-primary-900 mb-4">Items</h3>
                        <div className="space-y-4">
                            {quotation.lines.map((line) => (
                                <div key={line.id} className="flex items-start justify-between p-4 border border-primary-100 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-primary-900">{line.product_name}</p>
                                        <p className="text-sm text-primary-500">
                                            Qty: {line.quantity} • {line.rental_period_type}ly
                                        </p>
                                        <div className="text-xs text-primary-400 mt-1">
                                            {format(new Date(line.rental_start_date), 'MMM d')} - {format(new Date(line.rental_end_date), 'MMM d, yyyy')}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        {/* Vendor Editing Interface */}
                                        {isVendor && (quotation.status.toUpperCase() === 'DRAFT') ? (
                                            <div className="flex flex-col items-end gap-2">
                                                <label className="text-xs text-primary-500">Unit Price</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-primary-400 text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        value={editedLines[line.id]}
                                                        onChange={(e) => handlePriceChange(line.id, parseFloat(e.target.value) || 0)}
                                                        className="input py-1 px-2 w-24 text-right"
                                                    />
                                                </div>
                                                <p className="font-bold text-primary-900">
                                                    Total: {formatPrice(calculateLineTotal(line, editedLines[line.id]))}
                                                </p>
                                            </div>
                                        ) : (
                                            // Read Only View
                                            <>
                                                <p className="text-sm text-primary-500">
                                                    {formatPrice(line.unitPrice)} / unit
                                                </p>
                                                <p className="font-bold text-primary-900 mt-1">
                                                    {formatPrice(line.total_price)}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-6 pt-6 border-t border-primary-200">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between font-bold text-lg text-primary-900">
                                        <span>Total Amount</span>
                                        <span>
                                            {isVendor && (quotation.status.toUpperCase() === 'DRAFT')
                                                ? formatPrice(calculateTotal())
                                                : formatPrice(quotation.totalAmount)
                                            }
                                        </span>
                                    </div>
                                    {isVendor && (quotation.status.toUpperCase() === 'DRAFT') && (
                                        <p className="text-xs text-right text-primary-500">* Total excludes tax, calculated on finalize</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="font-semibold text-primary-900 mb-4">Customer Info</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <UserIcon size={20} className="text-primary-600" />
                            </div>
                            <div>
                                <p className="font-medium text-primary-900">{quotation.customer_name}</p>
                                <p className="text-xs text-primary-500">Customer ID: ...{quotation.customerId.slice(-4)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-primary-900 mb-4">Actions</h3>
                        <div className="space-y-3">

                            {/* VENDOR ACTIONS */}
                            {isVendor && (quotation.status.toUpperCase() === 'DRAFT') && (
                                <button
                                    onClick={handleVendorSubmit}
                                    disabled={processing}
                                    className="btn btn-primary w-full"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                    Submit Quote
                                </button>
                            )}

                            {/* CUSTOMER ACTIONS */}
                            {isCustomer && quotation.status.toUpperCase() === 'SENT' && (
                                <>
                                    <button
                                        onClick={() => handleUserResponse(true)}
                                        disabled={processing}
                                        className="btn btn-primary w-full"
                                    >
                                        {processing ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                                        Accept Quote
                                    </button>
                                    <button
                                        onClick={() => handleUserResponse(false)}
                                        disabled={processing}
                                        className="btn btn-outline w-full text-red-600 hover:bg-red-50 border-red-200"
                                    >
                                        <XCircle size={18} />
                                        Reject Quote
                                    </button>
                                </>
                            )}

                            {/* POST-ACCEPTANCE ACTIONS */}
                            {quotation.status.toUpperCase() === 'CONFIRMED' && (
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <p className="text-green-800 font-medium mb-3">Quote Accepted!</p>
                                    {isCustomer && (
                                        <button
                                            onClick={handleCreateOrder}
                                            disabled={processing}
                                            className="btn btn-primary w-full"
                                        >
                                            {processing ? <Loader2 className="animate-spin" /> : <DollarSign size={18} />}
                                            Confirm & Pay (Create Order)
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* SUCCESS STATE */}
                            {quotation.status.toUpperCase() === 'ORDERED' && (
                                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle size={24} className="text-blue-600" />
                                    </div>
                                    <p className="text-blue-900 font-bold mb-1">Order Placed</p>
                                    <p className="text-blue-700 text-sm mb-3">
                                        An order has been created from this quotation.
                                    </p>
                                    <button
                                        onClick={() => navigate('/orders')}
                                        className="btn btn-outline w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        View Orders
                                    </button>
                                </div>
                            )}

                            {/* Other States */}
                            {quotation.status.toUpperCase() === 'DRAFT' && isCustomer && (
                                <p className="text-sm text-center text-primary-500">
                                    Waiting for vendor review...
                                </p>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
