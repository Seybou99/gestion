import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Données complètes des pays avec drapeaux - 195+ pays
const COUNTRIES_DATA = [
  // Europe (par ordre alphabétique)
  { code: 'AD', name: 'Andorre', flag: '🇦🇩', dialCode: '+376' },
  { code: 'AL', name: 'Albanie', flag: '🇦🇱', dialCode: '+355' },
  { code: 'AT', name: 'Autriche', flag: '🇦🇹', dialCode: '+43' },
  { code: 'BA', name: 'Bosnie-Herzégovine', flag: '🇧🇦', dialCode: '+387' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
  { code: 'BG', name: 'Bulgarie', flag: '🇧🇬', dialCode: '+359' },
  { code: 'BY', name: 'Biélorussie', flag: '🇧🇾', dialCode: '+375' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41' },
  { code: 'CY', name: 'Chypre', flag: '🇨🇾', dialCode: '+357' },
  { code: 'CZ', name: 'République tchèque', flag: '🇨🇿', dialCode: '+420' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
  { code: 'DK', name: 'Danemark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'EE', name: 'Estonie', flag: '🇪🇪', dialCode: '+372' },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
  { code: 'FI', name: 'Finlande', flag: '🇫🇮', dialCode: '+358' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  { code: 'GR', name: 'Grèce', flag: '🇬🇷', dialCode: '+30' },
  { code: 'HR', name: 'Croatie', flag: '🇭🇷', dialCode: '+385' },
  { code: 'HU', name: 'Hongrie', flag: '🇭🇺', dialCode: '+36' },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', dialCode: '+353' },
  { code: 'IS', name: 'Islande', flag: '🇮🇸', dialCode: '+354' },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dialCode: '+423' },
  { code: 'LT', name: 'Lituanie', flag: '🇱🇹', dialCode: '+370' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352' },
  { code: 'LV', name: 'Lettonie', flag: '🇱🇻', dialCode: '+371' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377' },
  { code: 'MD', name: 'Moldavie', flag: '🇲🇩', dialCode: '+373' },
  { code: 'ME', name: 'Monténégro', flag: '🇲🇪', dialCode: '+382' },
  { code: 'MK', name: 'Macédoine du Nord', flag: '🇲🇰', dialCode: '+389' },
  { code: 'MT', name: 'Malte', flag: '🇲🇹', dialCode: '+356' },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31' },
  { code: 'NO', name: 'Norvège', flag: '🇳🇴', dialCode: '+47' },
  { code: 'PL', name: 'Pologne', flag: '🇵🇱', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'RO', name: 'Roumanie', flag: '🇷🇴', dialCode: '+40' },
  { code: 'RS', name: 'Serbie', flag: '🇷🇸', dialCode: '+381' },
  { code: 'RU', name: 'Russie', flag: '🇷🇺', dialCode: '+7' },
  { code: 'SE', name: 'Suède', flag: '🇸🇪', dialCode: '+46' },
  { code: 'SI', name: 'Slovénie', flag: '🇸🇮', dialCode: '+386' },
  { code: 'SK', name: 'Slovaquie', flag: '🇸🇰', dialCode: '+421' },
  { code: 'SM', name: 'Saint-Marin', flag: '🇸🇲', dialCode: '+378' },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷', dialCode: '+90' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dialCode: '+380' },
  { code: 'VA', name: 'Vatican', flag: '🇻🇦', dialCode: '+379' },

  // Afrique (par ordre alphabétique)
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', dialCode: '+267' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
  { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', dialCode: '+238' },
  { code: 'CF', name: 'République centrafricaine', flag: '🇨🇫', dialCode: '+236' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dialCode: '+235' },
  { code: 'KM', name: 'Comores', flag: '🇰🇲', dialCode: '+269' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242' },
  { code: 'CD', name: 'République démocratique du Congo', flag: '🇨🇩', dialCode: '+243' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dialCode: '+253' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', dialCode: '+20' },
  { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', dialCode: '+240' },
  { code: 'ER', name: 'Érythrée', flag: '🇪🇷', dialCode: '+291' },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dialCode: '+251' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
  { code: 'GM', name: 'Gambie', flag: '🇬🇲', dialCode: '+220' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dialCode: '+266' },
  { code: 'LR', name: 'Libéria', flag: '🇱🇷', dialCode: '+231' },
  { code: 'LY', name: 'Libye', flag: '🇱🇾', dialCode: '+218' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', dialCode: '+265' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', dialCode: '+222' },
  { code: 'MU', name: 'Maurice', flag: '🇲🇺', dialCode: '+230' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dialCode: '+258' },
  { code: 'NA', name: 'Namibie', flag: '🇳🇦', dialCode: '+264' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'ST', name: 'São Tomé-et-Príncipe', flag: '🇸🇹', dialCode: '+239' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dialCode: '+248' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232' },
  { code: 'SO', name: 'Somalie', flag: '🇸🇴', dialCode: '+252' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dialCode: '+27' },
  { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸', dialCode: '+211' },
  { code: 'SD', name: 'Soudan', flag: '🇸🇩', dialCode: '+249' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dialCode: '+268' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dialCode: '+255' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dialCode: '+256' },
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },

  // Amérique du Nord
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽', dialCode: '+52' },

  // Amérique centrale et Caraïbes
  { code: 'AG', name: 'Antigua-et-Barbuda', flag: '🇦🇬', dialCode: '+1268' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', dialCode: '+1242' },
  { code: 'BB', name: 'Barbade', flag: '🇧🇧', dialCode: '+1246' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', dialCode: '+501' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53' },
  { code: 'DM', name: 'Dominique', flag: '🇩🇲', dialCode: '+1767' },
  { code: 'DO', name: 'République dominicaine', flag: '🇩🇴', dialCode: '+1809' },
  { code: 'SV', name: 'Salvador', flag: '🇸🇻', dialCode: '+503' },
  { code: 'GD', name: 'Grenade', flag: '🇬🇩', dialCode: '+1473' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502' },
  { code: 'HT', name: 'Haïti', flag: '🇭🇹', dialCode: '+509' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504' },
  { code: 'JM', name: 'Jamaïque', flag: '🇯🇲', dialCode: '+1876' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', dialCode: '+507' },
  { code: 'KN', name: 'Saint-Kitts-et-Nevis', flag: '🇰🇳', dialCode: '+1869' },
  { code: 'LC', name: 'Sainte-Lucie', flag: '🇱🇨', dialCode: '+1758' },
  { code: 'VC', name: 'Saint-Vincent-et-les-Grenadines', flag: '🇻🇨', dialCode: '+1784' },
  { code: 'TT', name: 'Trinité-et-Tobago', flag: '🇹🇹', dialCode: '+1868' },

  // Amérique du Sud
  { code: 'AR', name: 'Argentine', flag: '🇦🇷', dialCode: '+54' },
  { code: 'BO', name: 'Bolivie', flag: '🇧🇴', dialCode: '+591' },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'CL', name: 'Chili', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CO', name: 'Colombie', flag: '🇨🇴', dialCode: '+57' },
  { code: 'EC', name: 'Équateur', flag: '🇪🇨', dialCode: '+593' },
  { code: 'FK', name: 'Îles Malouines', flag: '🇫🇰', dialCode: '+500' },
  { code: 'GF', name: 'Guyane française', flag: '🇬🇫', dialCode: '+594' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', dialCode: '+592' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595' },
  { code: 'PE', name: 'Pérou', flag: '🇵🇪', dialCode: '+51' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', dialCode: '+597' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58' },

  // Asie
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dialCode: '+93' },
  { code: 'AM', name: 'Arménie', flag: '🇦🇲', dialCode: '+374' },
  { code: 'AZ', name: 'Azerbaïdjan', flag: '🇦🇿', dialCode: '+994' },
  { code: 'BH', name: 'Bahreïn', flag: '🇧🇭', dialCode: '+973' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'BT', name: 'Bhoutan', flag: '🇧🇹', dialCode: '+975' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', dialCode: '+673' },
  { code: 'KH', name: 'Cambodge', flag: '🇰🇭', dialCode: '+855' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳', dialCode: '+86' },
  { code: 'GE', name: 'Géorgie', flag: '🇬🇪', dialCode: '+995' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳', dialCode: '+91' },
  { code: 'ID', name: 'Indonésie', flag: '🇮🇩', dialCode: '+62' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98' },
  { code: 'IQ', name: 'Irak', flag: '🇮🇶', dialCode: '+964' },
  { code: 'IL', name: 'Israël', flag: '🇮🇱', dialCode: '+972' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵', dialCode: '+81' },
  { code: 'JO', name: 'Jordanie', flag: '🇯🇴', dialCode: '+962' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dialCode: '+7' },
  { code: 'KW', name: 'Koweït', flag: '🇰🇼', dialCode: '+965' },
  { code: 'KG', name: 'Kirghizistan', flag: '🇰🇬', dialCode: '+996' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', dialCode: '+856' },
  { code: 'LB', name: 'Liban', flag: '🇱🇧', dialCode: '+961' },
  { code: 'MY', name: 'Malaisie', flag: '🇲🇾', dialCode: '+60' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', dialCode: '+960' },
  { code: 'MN', name: 'Mongolie', flag: '🇲🇳', dialCode: '+976' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dialCode: '+95' },
  { code: 'NP', name: 'Népal', flag: '🇳🇵', dialCode: '+977' },
  { code: 'KP', name: 'Corée du Nord', flag: '🇰🇵', dialCode: '+850' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', dialCode: '+970' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'SA', name: 'Arabie saoudite', flag: '🇸🇦', dialCode: '+966' },
  { code: 'SG', name: 'Singapour', flag: '🇸🇬', dialCode: '+65' },
  { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷', dialCode: '+82' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'SY', name: 'Syrie', flag: '🇸🇾', dialCode: '+963' },
  { code: 'TW', name: 'Taïwan', flag: '🇹🇼', dialCode: '+886' },
  { code: 'TJ', name: 'Tadjikistan', flag: '🇹🇯', dialCode: '+992' },
  { code: 'TH', name: 'Thaïlande', flag: '🇹🇭', dialCode: '+66' },
  { code: 'TL', name: 'Timor oriental', flag: '🇹🇱', dialCode: '+670' },
  { code: 'TM', name: 'Turkménistan', flag: '🇹🇲', dialCode: '+993' },
  { code: 'AE', name: 'Émirats arabes unis', flag: '🇦🇪', dialCode: '+971' },
  { code: 'UZ', name: 'Ouzbékistan', flag: '🇺🇿', dialCode: '+998' },
  { code: 'VN', name: 'Viêt Nam', flag: '🇻🇳', dialCode: '+84' },
  { code: 'YE', name: 'Yémen', flag: '🇾🇪', dialCode: '+967' },

  // Océanie
  { code: 'AU', name: 'Australie', flag: '🇦🇺', dialCode: '+61' },
  { code: 'FJ', name: 'Fidji', flag: '🇫🇯', dialCode: '+679' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dialCode: '+686' },
  { code: 'MH', name: 'Îles Marshall', flag: '🇲🇭', dialCode: '+692' },
  { code: 'FM', name: 'Micronésie', flag: '🇫🇲', dialCode: '+691' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', dialCode: '+674' },
  { code: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿', dialCode: '+64' },
  { code: 'PW', name: 'Palaos', flag: '🇵🇼', dialCode: '+680' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée', flag: '🇵🇬', dialCode: '+675' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', dialCode: '+685' },
  { code: 'SB', name: 'Îles Salomon', flag: '🇸🇧', dialCode: '+677' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', dialCode: '+676' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dialCode: '+688' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dialCode: '+678' },

  // Territoires et dépendances
  { code: 'AX', name: 'Îles Åland', flag: '🇦🇽', dialCode: '+358' },
  { code: 'AS', name: 'Samoa américaines', flag: '🇦🇸', dialCode: '+1684' },
  { code: 'AW', name: 'Aruba', flag: '🇦🇼', dialCode: '+297' },
  { code: 'AI', name: 'Anguilla', flag: '🇦🇮', dialCode: '+1264' },
  { code: 'AQ', name: 'Antarctique', flag: '🇦🇶', dialCode: '+672' },
  { code: 'BM', name: 'Bermudes', flag: '🇧🇲', dialCode: '+1441' },
  { code: 'IO', name: 'Territoire britannique de l\'océan Indien', flag: '🇮🇴', dialCode: '+246' },
  { code: 'VG', name: 'Îles Vierges britanniques', flag: '🇻🇬', dialCode: '+1284' },
  { code: 'KY', name: 'Îles Caïmans', flag: '🇰🇾', dialCode: '+1345' },
  { code: 'CX', name: 'Île Christmas', flag: '🇨🇽', dialCode: '+61' },
  { code: 'CC', name: 'Îles Cocos', flag: '🇨🇨', dialCode: '+61' },
  { code: 'CK', name: 'Îles Cook', flag: '🇨🇰', dialCode: '+682' },
  { code: 'FO', name: 'Îles Féroé', flag: '🇫🇴', dialCode: '+298' },
  { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', dialCode: '+350' },
  { code: 'GL', name: 'Groenland', flag: '🇬🇱', dialCode: '+299' },
  { code: 'GP', name: 'Guadeloupe', flag: '🇬🇵', dialCode: '+590' },
  { code: 'GU', name: 'Guam', flag: '🇬🇺', dialCode: '+1671' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852' },
  { code: 'MO', name: 'Macao', flag: '🇲🇴', dialCode: '+853' },
  { code: 'MQ', name: 'Martinique', flag: '🇲🇶', dialCode: '+596' },
  { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dialCode: '+262' },
  { code: 'MS', name: 'Montserrat', flag: '🇲🇸', dialCode: '+1664' },
  { code: 'NC', name: 'Nouvelle-Calédonie', flag: '🇳🇨', dialCode: '+687' },
  { code: 'NF', name: 'Île Norfolk', flag: '🇳🇫', dialCode: '+672' },
  { code: 'MP', name: 'Îles Mariannes du Nord', flag: '🇲🇵', dialCode: '+1670' },
  { code: 'PR', name: 'Porto Rico', flag: '🇵🇷', dialCode: '+1787' },
  { code: 'RE', name: 'La Réunion', flag: '🇷🇪', dialCode: '+262' },
  { code: 'BL', name: 'Saint-Barthélemy', flag: '🇧🇱', dialCode: '+590' },
  { code: 'SH', name: 'Sainte-Hélène', flag: '🇸🇭', dialCode: '+290' },
  { code: 'MF', name: 'Saint-Martin', flag: '🇲🇫', dialCode: '+590' },
  { code: 'PM', name: 'Saint-Pierre-et-Miquelon', flag: '🇵🇲', dialCode: '+508' },
  { code: 'SX', name: 'Sint Maarten', flag: '🇸🇽', dialCode: '+1721' },
  { code: 'TK', name: 'Tokelau', flag: '🇹🇰', dialCode: '+690' },
  { code: 'TC', name: 'Îles Turques-et-Caïques', flag: '🇹🇨', dialCode: '+1649' },
  { code: 'VI', name: 'Îles Vierges des États-Unis', flag: '🇻🇮', dialCode: '+1340' },
  { code: 'WF', name: 'Wallis-et-Futuna', flag: '🇼🇫', dialCode: '+681' },
  { code: 'EH', name: 'Sahara occidental', flag: '🇪🇭', dialCode: '+212' },
];

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCountry: (country: Country) => void;
  selectedCountry?: Country;
}

export default function CountryPickerModal({
  visible,
  onClose,
  onSelectCountry,
  selectedCountry,
}: CountryPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrage des pays basé sur la recherche
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES_DATA;
    }

    const query = searchQuery.toLowerCase();
    return COUNTRIES_DATA.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleCountrySelect = (country: Country) => {
    onSelectCountry(country);
    onClose();
  };

  const renderCountryItem = ({ item }: { item: Country }) => {
    const isSelected = selectedCountry?.code === item.code;

    return (
      <TouchableOpacity
        style={[styles.countryItem, isSelected && styles.selectedCountryItem]}
        onPress={() => handleCountrySelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.countryInfo}>
          <Text style={styles.countryFlag}>{item.flag}</Text>
          <View style={styles.countryDetails}>
            <Text style={styles.countryName}>{item.name}</Text>
            <Text style={styles.countryCode}>{item.code}</Text>
          </View>
        </View>
        <Text style={styles.dialCode}>{item.dialCode}</Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sélectionner un pays</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Liste des pays */}
        <FlatList
          data={filteredCountries}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.code}
          style={styles.countriesList}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Aucun pays trouvé pour "{searchQuery}"
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  countriesList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCountryItem: {
    backgroundColor: '#f0f8ff',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  countryDetails: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
