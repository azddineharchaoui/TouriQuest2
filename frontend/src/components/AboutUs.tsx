import React from 'react';
import { 
  Compass, 
  Users, 
  Award, 
  Target, 
  Heart,
  MapPin,
  Camera,
  Plane,
  Mountain,
  Sunset
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface AboutUsProps {
  onBack?: () => void;
}

export function AboutUs({ onBack }: AboutUsProps) {
  const team = [
    {
      name: 'Azeddine Harchaoui',
      role: 'Co-Founder & CEO',
      bio: 'Passionate about showcasing Morocco\'s hidden gems and authentic experiences.',
      image: 'images/team/azeddine-ceo.jpg',
      location: 'Meknès, Morocco'
    },
    {
      name: 'Achraf Jari',
      role: 'Co-Founder & COO',
      bio: 'Expert in Moroccan traditions, crafts, and connecting travelers with local artisans.',
      image: 'images/team/achraf-marketing.jpg',
      location: 'Khenifra, Morocco'
    }
  ];

  const values = [
    {
      icon: Heart,
      title: 'Authentic Experiences',
      description: 'We believe in genuine connections with Moroccan culture, not tourist traps.',
      color: 'text-red-600'
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'Supporting local communities and ensuring tourism benefits everyone.',
      color: 'text-blue-600'
    },
    {
      icon: Mountain,
      title: 'Sustainable Tourism',
      description: 'Preserving Morocco\'s natural beauty for future generations.',
      color: 'text-green-600'
    },
    {
      icon: Award,
      title: 'Quality Assurance',
      description: 'Every experience is carefully curated and personally tested.',
      color: 'text-orange-600'
    }
  ];

  const stats = [
    { number: '50+', label: 'Unique Tours', icon: Compass },
    { number: '5', label: 'Cities Covered', icon: MapPin },
    { number: '200+', label: 'Happy Travelers', icon: Users },
    { number: '3', label: 'Years Experience', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-black">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <Compass className="h-8 w-8 text-black" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl text-green-600 font-bold mb-6">About TouriQuest</h1>
            <p className="text-xl text-black/90 leading-relaxed max-w-3xl mx-auto">
              Born from a passion for Morocco's incredible diversity, TouriQuest connects 
              travelers with authentic experiences that celebrate our rich heritage and natural beauty.
            </p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-green-600 hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* Mission Statement */}
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Our Mission</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-left">
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                TouriQuest was founded with a simple belief: Morocco's true beauty lies not just 
                in its famous landmarks, but in its people, traditions, and hidden corners that 
                most tourists never discover.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                We're a small, passionate team dedicated to creating meaningful connections 
                between travelers and the Morocco we know and love – authentic, diverse, and magical.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1539650116574-75c0c6d73388?w=500&h=400&fit=crop" 
                alt="Moroccan architecture"
                className="rounded-xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-600/30 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Journey So Far</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-2">{stat.number}</div>
                    <div className="text-gray-600 text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-6 w-6 ${value.color}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">{value.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Team */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-6 object-cover"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{member.name}</h3>
                  <Badge variant="secondary" className="mb-4">{member.role}</Badge>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{member.bio}</p>
                  <div className="flex items-center justify-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {member.location}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-12 text-center text-black">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Ready to Explore Morocco?</h2>
            <p className="text-xl text-black/90 mb-8 leading-relaxed">
              Join us on a journey through Morocco's incredible landscapes, vibrant cities, 
              and warm hospitality. Let's create memories that will last a lifetime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-orange-600 hover:bg-gray-100 font-semibold"
              >
                Browse Our Tours
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-black hover:bg-white/10"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}