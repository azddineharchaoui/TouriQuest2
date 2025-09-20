import React from 'react';
import { FileText, Scale, Shield, AlertTriangle, CreditCard, Calendar, Plane, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
  const lastUpdated = "September 1, 2024";
  const effectiveDate = "September 1, 2024";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Scale className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms of Service</h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              These terms govern your use of TouriQuest services and establish the legal 
              agreement between you and our company.
            </p>
            <p className="text-white/70 mt-4">Last updated: {lastUpdated}</p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* Introduction */}
        <div className="max-w-4xl mx-auto mb-12">
          <Alert className="border-blue-200 bg-blue-50">
            <FileText className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> Please read these Terms of Service carefully before using our services. 
              By booking a tour or using our website, you agree to be bound by these terms.
            </AlertDescription>
          </Alert>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <span>About TouriQuest</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed mb-4">
                TouriQuest is a Morocco-based tourism company registered under Moroccan law. 
                We provide tour services, accommodation bookings, and travel experiences throughout Morocco.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-800">Company Name:</strong> TouriQuest SARL
                </div>
                <div>
                  <strong className="text-gray-800">Registration:</strong> Morocco Commercial Registry
                </div>
                <div>
                  <strong className="text-gray-800">Address:</strong> Marrakech, Morocco
                </div>
                <div>
                  <strong className="text-gray-800">License:</strong> Morocco Tourism License #12345
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <span>Booking Terms & Conditions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Booking Process</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">All bookings must be confirmed in writing via email</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">A deposit of 30% is required to secure your booking</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Full payment is due 14 days before tour departure</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Bookings are subject to availability and confirmation</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Pricing & Payment</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">All prices are in USD unless otherwise stated</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Prices include services specified in the tour description</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Additional charges may apply for extra services or changes</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">We accept major credit cards, PayPal, and bank transfers</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <span>Cancellation & Refund Policy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Cancellation by Customer</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">More than 14 days before departure</h5>
                      <p className="text-green-600 font-semibold">Full refund minus 10% processing fee</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">7-14 days before departure</h5>
                      <p className="text-orange-600 font-semibold">50% refund</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">3-7 days before departure</h5>
                      <p className="text-red-600 font-semibold">25% refund</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">Less than 3 days or no-show</h5>
                      <p className="text-red-600 font-semibold">No refund</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Cancellation by TouriQuest</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Full refund if we cancel due to insufficient bookings</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Alternative tour or full refund for weather-related cancellations</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">We are not liable for costs beyond the tour price</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plane className="h-5 w-5 text-blue-600" />
                </div>
                <span>Travel Requirements & Responsibilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Customer Responsibilities</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Valid passport with at least 6 months validity</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Appropriate visas or entry requirements for your nationality</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Travel insurance coverage (strongly recommended)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Disclosure of medical conditions or dietary requirements</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Respectful behavior towards local customs and other travelers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <span>Liability & Insurance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Important:</strong> Travel involves inherent risks. Please read this section carefully.
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Our Liability</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">We maintain professional liability insurance for our services</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Liability is limited to the tour price paid</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">We are not liable for acts of third-party service providers</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Force majeure events are excluded from our liability</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Travel Insurance</h4>
                  <p className="text-gray-600 leading-relaxed">
                    We strongly recommend purchasing comprehensive travel insurance to cover medical expenses, 
                    trip cancellation, lost luggage, and other unforeseen circumstances. Travel insurance 
                    is the customer's responsibility and should be arranged independently.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Website Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <span>Website Usage Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Acceptable Use</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Use the website only for lawful purposes</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Do not attempt to gain unauthorized access to our systems</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Respect intellectual property rights</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-600">Provide accurate information when making bookings</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Intellectual Property</h4>
                  <p className="text-gray-600 leading-relaxed">
                    All content on this website, including text, images, logos, and designs, is owned by 
                    TouriQuest or our partners and is protected by copyright and trademark laws. 
                    You may not reproduce, distribute, or use our content without written permission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Scale className="h-5 w-5 text-gray-600" />
                </div>
                <span>Governing Law & Disputes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  These Terms of Service are governed by the laws of Morocco. Any disputes arising from 
                  these terms or your use of our services will be subject to the exclusive jurisdiction 
                  of the courts of Marrakech, Morocco.
                </p>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Dispute Resolution</h4>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li className="text-gray-600">First, contact us directly to resolve any issues</li>
                    <li className="text-gray-600">If unresolved, disputes may be referred to mediation</li>
                    <li className="text-gray-600">Final disputes will be handled by Moroccan courts</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Updates */}
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Questions About These Terms?</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                If you have any questions about these Terms of Service or need clarification 
                on any provisions, please contact our legal team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-indigo-600 hover:bg-gray-100 font-semibold"
                >
                  Contact Legal Team
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                >
                  View Privacy Policy
                </Button>
              </div>
              
              <Separator className="my-6 bg-white/20" />
              
              <div className="text-center">
                <p className="text-white/90 text-sm">
                  <strong>Effective Date:</strong> {effectiveDate} | 
                  <strong> Last Updated:</strong> {lastUpdated}
                </p>
                <p className="text-white/70 text-sm mt-2">
                  These terms may be updated periodically. Continued use of our services 
                  constitutes acceptance of any changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}