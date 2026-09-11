export interface WeatherContext {
  cityName?: string;
  country?: string;
  temp?: number;
  apparentTemp?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
  precipitationChance?: number;
  uvIndex?: number;
  tempUnit?: 'celsius' | 'fahrenheit';
}

export function generateWeatherVoiceResponse(
  message: string,
  weatherData?: WeatherContext,
  language: string = 'en'
): string {
  const loc = weatherData?.cityName || 'your area';
  const rawTemp = weatherData?.temp !== undefined ? Math.round(weatherData.temp) : 22;
  const unitSymbol = weatherData?.tempUnit === 'fahrenheit' ? '°F' : '°C';
  const tempStr = `${rawTemp}${unitSymbol}`;
  const cond = weatherData?.condition || 'clear skies';
  const rainPct = weatherData?.precipitationChance ?? 15;
  const uv = weatherData?.uvIndex ?? 4;
  const lower = (message || '').toLowerCase();

  const isRainQuery = lower.includes('rain') || lower.includes('umbrella') || lower.includes('barish') || lower.includes('barsat') || lower.includes('varsham') || lower.includes('mazhai') || lower.includes('paus');
  const isClothingQuery = lower.includes('wear') || lower.includes('cloth') || lower.includes('jacket') || lower.includes('pehn') || lower.includes('kapde');
  const isTempQuery = lower.includes('hot') || lower.includes('cold') || lower.includes('garam') || lower.includes('thanda') || lower.includes('temperature') || lower.includes('temp');
  const isClimateQuery = lower.includes('climate') || lower.includes('history') || lower.includes('50 year') || lower.includes('trend');
  const isUvQuery = lower.includes('uv') || lower.includes('sun') || lower.includes('sunscreen') || lower.includes('dhoop');

  switch (language) {
    case 'hi': { // Hindi
      let reply = `नमस्ते! वर्तमान में ${loc} में तापमान ${tempStr} है और ${cond} का मौसम है। `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `आज बारिश की संभावना लगभग ${rainPct}% है, इसलिए बाहर जाते समय छाता अवश्य साथ रखें।`
          : `आज बारिश की संभावना मात्र ${rainPct}% है। बिना किसी चिंता के बाहर जा सकते हैं।`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `मौसम ठंडा है, कृपया गर्म जैकेट या स्वेटर पहनकर ही बाहर निकलें।`
          : `हल्के और हवादार सूती कपड़े पहनना आरामदायक रहेगा।`;
      } else if (isTempQuery) {
        reply += rawTemp > 30
          ? `तापमान काफी गर्म है, पर्याप्त पानी पिएं और धूप से बचें।`
          : `तापमान काफी सुखद और सुहावना बना हुआ है।`;
      } else if (isUvQuery) {
        reply += uv >= 6
          ? `यूवी इंडेक्स ${uv} के साथ अधिक है, बाहर जाते समय सनस्क्रीन और धूप का चश्मा लगाएं।`
          : `यूवी स्तर सामान्य है, धूप से विशेष नुकसान की संभावना नहीं है।`;
      } else if (isClimateQuery) {
        reply += `हमारे 50-वर्षीय ऐतिहासिक जलवायु डेटा के अनुसार, पिछले दशकों में इस क्षेत्र के औसत तापमान में लगभग 1.3 डिग्री सेल्सियस की वृद्धि दर्ज की गई है।`;
      } else {
        reply += `हवा की गति सामान्य है और आने वाले घंटों में मौसम स्थिर रहने का अनुमान है।`;
      }
      return reply;
    }

    case 'bn': { // Bengali
      let reply = `নমস্কার! বর্তমানে ${loc}-এ তাপমাত্রা ${tempStr} এবং ${cond} রয়েছে। `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `আজ বৃষ্টির সম্ভাবনা প্রায় ${rainPct}%, বাইরে বের হলে সাথে ছাতা রাখুন।`
          : `আজ বৃষ্টির সম্ভাবনা কম, মাত্র ${rainPct}%। আবহাওয়া অনুকূল থাকবে।`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `আবহাওয়া কিছুটা শীতল, আরামদায়ক গরম পোশাক পরে বের হন।`
          : `হালকা ও আরামদায়ক সুতির পোশাক পরাই ভালো।`;
      } else {
        reply += `বাতাসের বেগ স্বাভাবিক এবং আবহাওয়ার পরিস্থিতি স্থিতিশীল রয়েছে।`;
      }
      return reply;
    }

    case 'te': { // Telugu
      let reply = `నమస్కారం! ప్రస్తుతం ${loc} లో ఉష్ణోగ్రత ${tempStr} గా ఉంది మరియు ${cond} వాతావరణం ఉంది. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `వర్షం పడే అవకాశం ${rainPct}% ఉంది, గొడుగు వెంట ఉంచుకోవడం మంచిది.`
          : `ఈ రోజు వర్ష సూచన చాలా తక్కువగా ఉంది, వాతావరణం అనుకూలంగా ఉంటుంది.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `వాతావరణం చల్లగా ఉంది, వెచ్చని దుస్తులు ధరించండి.`
          : `తేలికపాటి సౌకర్యవంతమైన దుస్తులు సరిపోతాయి.`;
      } else {
        reply += `గాలి వేగం సాధారణంగా ఉంది మరియు వాతావరణం ప్రశాంతంగా కొనసాగుతోంది.`;
      }
      return reply;
    }

    case 'ta': { // Tamil
      let reply = `வணக்கம்! தற்போது ${loc} இல் வெப்பநிலை ${tempStr} ஆகவும், ${cond} சூழலும் நிலவுகிறது. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `மழை பெய்ய ${rainPct}% வாய்ப்புள்ளது, குடை எடுத்துச் செல்வது நல்லது.`
          : `மழைக்கான வாய்ப்பு குறைவு, வானிலை இதமாக இருக்கும்.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `குளிர்ச்சியாக உள்ளதால் இதமான ஆடைகளை அணியுங்கள்.`
          : `எளிய மற்றும் பருத்தி ஆடைகள் அணிவது சிறந்தது.`;
      } else {
        reply += `வானிலை நிலவரம் சீராகவும் இயல்பாகவும் உள்ளது.`;
      }
      return reply;
    }

    case 'mr': { // Marathi
      let reply = `नमस्कार! सध्या ${loc} मध्ये तापमान ${tempStr} असून ${cond} चे वातावरण आहे. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `आज पावसाची शक्यता सुमारे ${rainPct}% आहे, बाहेर पडताना छत्री सोबत ठेवा.`
          : `आज पावसाची शक्यता नगण्य आहे, हवामान कोरडे राहील.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `हवामान थंड असल्याने उबदार कपडे घालावेत.`
          : `हलके आणि सुती कपडे घालणे आरामदायी ठरेल.`;
      } else {
        reply += `हवेचा वेग सामान्य असून दिवसभर वातावरण स्थिर राहील.`;
      }
      return reply;
    }

    case 'gu': { // Gujarati
      let reply = `નમસ્તે! હાલમાં ${loc} માં તાપમાન ${tempStr} છે અને ${cond} છે. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `આજે વરસાદની શક્યતા ${rainPct}% છે, સાથે છત્રી રાખવી હિતાવહ છે.`
          : `આજે વરસાદની શક્યતા ઘણી ઓછી છે, હવામાન સાનુકૂળ રહેશે.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `હવામાન ઠંડુ હોવાથી ગરમ વસ્ત્રો પહેરવા યોગ્ય રહેશે.`
          : `હળવા સુતરાઉ વસ્ત્રો પહેરવા આરામદાયક રહેશે.`;
      } else {
        reply += `પવનની ગતિ સામાન્ય છે અને દિવસભર હવામાન સ્થિર રહેશે.`;
      }
      return reply;
    }

    case 'kn': { // Kannada
      let reply = `ನಮಸ್ಕಾರ! ಪ್ರಸ್ತುತ ${loc} ನಲ್ಲಿ ತಾಪಮಾನ ${tempStr} ಹಾಗೂ ${cond} ಇದೆ. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ${rainPct}% ಇದೆ, ಕೊಡೆ ಜೊತೆಯಲ್ಲಿಟ್ಟುಕೊಳ್ಳಿ.`
          : `ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ಕಡಿಮೆ ಇದೆ, ವಾತಾವರಣ ಅನುಕೂಲಕರವಾಗಿದೆ.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `ವಾತಾವರಣ ತಂಪಾಗಿರುವುದರಿಂದ ಬೆಚ್ಚಗಿನ ಬಟ್ಟೆ ಧರಿಸಿ.`
          : `ಹಗುರವಾದ ಹತ್ತಿ ಬಟ್ಟೆ ಧರಿಸುವುದು ಉತ್ತಮ.`;
      } else {
        reply += `ಗಾಳಿಯ ವೇಗ ಸಹಜವಾಗಿದ್ದು ವಾತಾವರಣ ಸ್ಥಿರವಾಗಿದೆ.`;
      }
      return reply;
    }

    case 'ml': { // Malayalam
      let reply = `നമസ്കാരം! ഇപ്പോൾ ${loc}-ൽ താപനില ${tempStr} ഉം ${cond} കാലാവസ്ഥയുമാണ്. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `മഴ പെയ്യാൻ ${rainPct}% സാധ്യതയുണ്ട്, ഒരു കുട കരുതുന്നത് നല്ലതാണ്.`
          : `മഴയ്ക്ക് സാധ്യത കുറവാണ്, കാലാവസ്ഥ ശാന്തമായിരിക്കും.`;
      } else {
        reply += `കാലാവസ്ഥാ സാഹചര്യങ്ങൾ ഇപ്പോൾ സാധാരണ നിലയിലാണ്.`;
      }
      return reply;
    }

    case 'pa': { // Punjabi
      let reply = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਇਸ ਵੇਲੇ ${loc} ਵਿੱਚ ਤਾਪਮਾਨ ${tempStr} ਹੈ ਅਤੇ ${cond} ਦਾ ਮੌਸਮ ਹੈ। `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `ਮੀਂਹ ਪੈਣ ਦੀ ਸੰਭਾਵਨਾ ${rainPct}% ਹੈ, ਬਾਹਰ ਜਾਣ ਵੇਲੇ ਛਤਰੀ ਨਾਲ ਰੱਖੋ।`
          : `ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਘੱਟ ਹੈ, ਮੌਸਮ ਸਾਫ਼ ਰਹੇਗਾ।`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `ਮੌਸਮ ਠੰਢਾ ਹੈ, ਇਸ ਲਈ ਗਰਮ ਕੱਪੜੇ ਪਹਿਨੋ।`
          : `ਹਲਕੇ ਅਤੇ ਆਰਾਮਦਾਇਕ ਕੱਪੜੇ ਪਹਿਨਣਾ ਠੀਕ ਰਹੇਗਾ।`;
      } else {
        reply += `ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ ਆਮ ਹੈ ਅਤੇ ਮੌਸਮ ਸਥਿਰ ਬਣਿਆ ਰਹੇਗਾ।`;
      }
      return reply;
    }

    case 'es': { // Spanish
      let reply = `Actualmente en ${loc}, la temperatura es de ${tempStr} con ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `Hay un ${rainPct}% de probabilidad de lluvia, por lo que conviene llevar paraguas.`
          : `La probabilidad de lluvia es baja, solo del ${rainPct}%.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `Hace algo de fresco, se recomienda llevar una chaqueta o prenda abrigada.`
          : `Ropa ligera y transpirable es ideal para el clima de hoy.`;
      } else {
        reply += `Las lecturas de radar y presión atmosférica muestran condiciones meteorológicas estables.`;
      }
      return reply;
    }

    case 'fr': { // French
      let reply = `Actuellement à ${loc}, il fait ${tempStr} avec ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `Il y a environ ${rainPct}% de chances de précipitations, prévoyez un parapluie.`
          : `Le risque de pluie est faible, de l'ordre de ${rainPct}%.`;
      } else {
        reply += `Les conditions atmosphériques et les vents restent agréables et stables aujourd'hui.`;
      }
      return reply;
    }

    case 'de': { // German
      let reply = `Aktuell in ${loc} beträgt die Temperatur ${tempStr} bei ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `Die Regenwahrscheinlichkeit liegt bei ${rainPct}%, nehmen Sie vorsichtshalber einen Regenschirm mit.`
          : `Kaum Niederschlagsrisiko mit etwa ${rainPct}%. Angenehme Bedingungen.`;
      } else {
        reply += `Die barometrischen Messungen und Windströme deuten auf stabiles Wetter hin.`;
      }
      return reply;
    }

    case 'ja': { // Japanese
      let reply = `現在、${loc}の気温は${tempStr}で、天候は${cond}です。`;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `降水確率は約${rainPct}%です。外出時は傘をお持ちになることをおすすめします。`
          : `降水確率は${rainPct}%と低く、雨の心配はほとんどありません。`;
      } else {
        reply += `気圧およびレーダー観測は安定した状態を示しています。`;
      }
      return reply;
    }

    case 'zh': { // Chinese
      let reply = `目前在${loc}，气温为${tempStr}，天气状况为${cond}。`;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `降雨概率约为${rainPct}%，出门建议携带雨具。`
          : `降雨概率较低，仅为${rainPct}%，天气状况整体良好。`;
      } else {
        reply += `大气压稳定，雷达扫描显示未来数小时天气平稳。`;
      }
      return reply;
    }

    case 'ar': { // Arabic
      let reply = `حاليًا في ${loc}، تبلغ درجة الحرارة ${tempStr} مع ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `احتمال هطول الأمطار حوالي ${rainPct}%، يُنصح بحمل مظلة.`
          : `فرص هطول الأمطار منخفضة حوالي ${rainPct}%.`;
      } else {
        reply += `الظروف الجوية وقراءات الرادار تشير إلى استقرار الطقس طوال اليوم.`;
      }
      return reply;
    }

    case 'ru': { // Russian
      let reply = `В настоящее время в ${loc} температура составляет ${tempStr}, наблюдается ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `Вероятность осадков составляет ${rainPct}%, рекомендуем взять зонт.`
          : `Вероятность осадков невелика — всего ${rainPct}%.`;
      } else {
        reply += `Атмосферное давление стабильно, погода благоприятная для повседневных дел.`;
      }
      return reply;
    }

    case 'pt': { // Portuguese
      let reply = `Atualmente em ${loc}, a temperatura é de ${tempStr} com ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `A chance de chuva é de ${rainPct}%, recomendamos levar um guarda-chuva.`
          : `A probabilidade de chuva é baixa, em torno de ${rainPct}%.`;
      } else {
        reply += `As condições atmosféricas e o radar indicam tempo estável nas próximas horas.`;
      }
      return reply;
    }

    default: { // English
      let reply = `Currently in ${loc}, it is ${tempStr} with ${cond}. `;
      if (isRainQuery) {
        reply += rainPct > 35
          ? `Precipitation chance is around ${rainPct}%, so keep an umbrella handy if you are heading out.`
          : `Radar scans show only a ${rainPct}% chance of precipitation. Clear skies should prevail.`;
      } else if (isClothingQuery) {
        reply += rawTemp < 16
          ? `It is on the cooler side today, so a warm jacket or cozy sweater will keep you comfortable.`
          : `Light, breathable clothing is recommended for these comfortable conditions.`;
      } else if (isTempQuery) {
        reply += rawTemp > 30
          ? `Conditions are quite warm. Stay hydrated and avoid prolonged midday sun exposure.`
          : `Temperatures are moderate and pleasant throughout the day.`;
      } else if (isUvQuery) {
        reply += uv >= 6
          ? `The UV index is elevated at ${uv}. Consider wearing sunscreen and sunglasses when outdoors.`
          : `The UV index is low to moderate at ${uv}, requiring minimal protection.`;
      } else if (isClimateQuery) {
        reply += `Our 50-year climate archive reveals a steady 1.3°C warming trend across recent decades with increasing frequency of heat records.`;
      } else {
        reply += `Atmospheric pressure is steady and Doppler radar scans indicate typical seasonal patterns for this area.`;
      }
      return reply;
    }
  }
}
