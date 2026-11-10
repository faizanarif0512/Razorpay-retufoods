'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-retu-charcoal text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
            Contact & Support
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-3 max-w-xl mx-auto">
            Reach out to our Bengaluru care team for order inquiries, corporate orders, and microbiome guidance.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-retu-warm-white/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Contact Details */}
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-retu-border shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-retu-charcoal">Official Company Details</h2>
                
                <div className="space-y-4 text-xs text-gray-600">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-retu-pink shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-retu-charcoal text-sm">DancingEarth Food Private Limited</p>
                      <p className="mt-0.5">2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru 560038, Karnataka, India</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-retu-charcoal text-sm">Customer Support Helpline</p>
                      <p className="mt-0.5">011-69269668 (Mon to Sat, 9:00 AM to 6:00 PM IST)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-retu-charcoal text-sm">Direct Email Assistance</p>
                      <p className="mt-0.5">
                        <a href="mailto:faizan.loyola@gmail.com" className="text-retu-pink hover:underline">
                          faizan.loyola@gmail.com
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-retu-mango shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-retu-charcoal text-sm">Cold-Chain Dispatch Hours</p>
                      <p className="mt-0.5">Monday through Thursday to preserve refrigerated weekend integrity.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500">
                  <p><strong>Singapore Office:</strong> GreenGourmet Foods Pte. Ltd., 160 Robinson Road #14-04, Singapore 068914</p>
                </div>
              </div>
            </div>

            {/* Message Form */}
            <div className="bg-white p-8 rounded-3xl border border-retu-border shadow-sm">
              {submitted ? (
                <div className="text-center py-12 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="text-lg font-bold text-retu-charcoal">Message Received!</h3>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto">
                    Thank you for reaching out. A Retü Foods wellness specialist will respond to your inquiry within 24 business hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-bold text-retu-pink hover:underline pt-2 inline-block"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-retu-charcoal">Send Us an Inquiry</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priyanshu Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="Order Inquiry / Wholesale / Nutrition Guidance"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Message *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="How can our Bengaluru team assist you today?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message to Team</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
