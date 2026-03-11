// frontend/src/components/workers/ApplicationPassModal.js
import React, { useState } from 'react';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './ApplicationPassModal.css';

const ApplicationPassModal = ({ isOpen, onClose, onSuccess }) => {
    const alert = useAlert();
    const [passType, setPassType] = useState('weekly');
    const [paymentMethod, setPaymentMethod] = useState('voucher');
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherPin, setVoucherPin] = useState('');
    const [loading, setLoading] = useState(false);

    const passOptions = {
        weekly: {
            name: 'Weekly Pass',
            applications: 10,
            price: 50,
            description: 'Apply for up to 10 jobs this week'
        },
        monthly: {
            name: 'Monthly Pass',
            applications: 30,
            price: 150,
            description: 'Apply for up to 30 jobs this month'
        }
    };

    const handlePurchase = async () => {
        setLoading(true);

        try {
            const paymentData = {
                pass_type: passType,
                payment_method: paymentMethod
            };

            if (paymentMethod === 'voucher') {
                paymentData.voucher_code = voucherCode;
                paymentData.voucher_pin = voucherPin;
            }

            const response = await api.post('/worker/buy-application-pass', paymentData);

            if (response.data.success) {
                alert.success(`✅ Purchased ${passOptions[passType].name}!`);
                onSuccess?.(response.data);
                onClose();
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert.error(error.response?.data?.message || 'Failed to purchase pass');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="pass-modal-overlay" onClick={onClose}>
            <div className="pass-modal" onClick={e => e.stopPropagation()}>
                <div className="pass-modal-header">
                    <h2>🎫 Buy Application Pass</h2>
                    <button className="pass-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="pass-modal-body">
                    <div className="pass-options">
                        <div 
                            className={`pass-option ${passType === 'weekly' ? 'selected' : ''}`}
                            onClick={() => setPassType('weekly')}
                        >
                            <h3>Weekly Pass</h3>
                            <div className="pass-price">R50</div>
                            <ul>
                                <li>✓ 10 job applications</li>
                                <li>✓ Valid for 7 days</li>
                                <li>✓ Apply to any jobs</li>
                            </ul>
                        </div>

                        <div 
                            className={`pass-option ${passType === 'monthly' ? 'selected' : ''}`}
                            onClick={() => setPassType('monthly')}
                        >
                            <h3>Monthly Pass</h3>
                            <div className="pass-price">R150</div>
                            <ul>
                                <li>✓ 30 job applications</li>
                                <li>✓ Valid for 30 days</li>
                                <li>✓ Best value</li>
                            </ul>
                        </div>
                    </div>

                    <div className="payment-section">
                        <h4>Payment Method</h4>
                        <div className="payment-methods">
                            <label className={`payment-method ${paymentMethod === 'voucher' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="voucher"
                                    checked={paymentMethod === 'voucher'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <span className="method-icon">🎫</span>
                                <span>Voucher</span>
                            </label>

                            <label className={`payment-method ${paymentMethod === 'eft' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="eft"
                                    checked={paymentMethod === 'eft'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <span className="method-icon">🏦</span>
                                <span>EFT</span>
                            </label>

                            <label className={`payment-method ${paymentMethod === 'google' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="google"
                                    checked={paymentMethod === 'google'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <span className="method-icon">📱</span>
                                <span>Google Pay</span>
                            </label>
                        </div>

                        {paymentMethod === 'voucher' && (
                            <div className="voucher-inputs">
                                <input
                                    type="text"
                                    placeholder="Voucher Code"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                />
                                <input
                                    type="text"
                                    placeholder="PIN"
                                    value={voucherPin}
                                    onChange={(e) => setVoucherPin(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pass-summary">
                        <p><strong>Total:</strong> R{passOptions[passType].price}</p>
                        <p><small>You'll get {passOptions[passType].applications} applications to use within {passType === 'weekly' ? '7' : '30'} days</small></p>
                    </div>

                    <div className="pass-modal-actions">
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button 
                            className="btn-purchase"
                            onClick={handlePurchase}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Purchase Pass'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationPassModal;