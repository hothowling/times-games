/*
 * rules.js - 수도 맞히기의 규칙(DOM 없음). tests/capitals.test.js 에서 검사합니다.
 * 나라: [국가 코드(국기), 한국어 이름, 영어 이름, 수도 한국어, 수도 영어, 단계]
 * 단계 1 = 쉬움(잘 알려진 나라), 2 = 보통, 3 = 어려움. 높은 단계는 낮은 단계 나라도 함께 나옵니다.
 * 수도가 둘 이상이거나 다툼이 있는 나라(볼리비아, 남아공, 이스라엘 등)와 수도를 옮기는 중인 인도네시아는 뺐습니다.
 */
export const COUNTRIES = [
  ['KR', '대한민국', 'South Korea', '서울', 'Seoul', 1],
  ['JP', '일본', 'Japan', '도쿄', 'Tokyo', 1],
  ['CN', '중국', 'China', '베이징', 'Beijing', 1],
  ['US', '미국', 'United States', '워싱턴 D.C.', 'Washington, D.C.', 1],
  ['GB', '영국', 'United Kingdom', '런던', 'London', 1],
  ['FR', '프랑스', 'France', '파리', 'Paris', 1],
  ['DE', '독일', 'Germany', '베를린', 'Berlin', 1],
  ['IT', '이탈리아', 'Italy', '로마', 'Rome', 1],
  ['ES', '스페인', 'Spain', '마드리드', 'Madrid', 1],
  ['RU', '러시아', 'Russia', '모스크바', 'Moscow', 1],
  ['CA', '캐나다', 'Canada', '오타와', 'Ottawa', 1],
  ['AU', '호주', 'Australia', '캔버라', 'Canberra', 1],
  ['BR', '브라질', 'Brazil', '브라질리아', 'Brasília', 1],
  ['IN', '인도', 'India', '뉴델리', 'New Delhi', 1],
  ['EG', '이집트', 'Egypt', '카이로', 'Cairo', 1],
  ['MX', '멕시코', 'Mexico', '멕시코시티', 'Mexico City', 1],
  ['TH', '태국', 'Thailand', '방콕', 'Bangkok', 1],
  ['VN', '베트남', 'Vietnam', '하노이', 'Hanoi', 1],
  ['GR', '그리스', 'Greece', '아테네', 'Athens', 1],
  ['AR', '아르헨티나', 'Argentina', '부에노스아이레스', 'Buenos Aires', 1],
  ['TR', '튀르키예', 'Türkiye', '앙카라', 'Ankara', 1],
  ['PH', '필리핀', 'Philippines', '마닐라', 'Manila', 1],
  ['NZ', '뉴질랜드', 'New Zealand', '웰링턴', 'Wellington', 1],

  ['PT', '포르투갈', 'Portugal', '리스본', 'Lisbon', 2],
  ['NL', '네덜란드', 'Netherlands', '암스테르담', 'Amsterdam', 2],
  ['BE', '벨기에', 'Belgium', '브뤼셀', 'Brussels', 2],
  ['CH', '스위스', 'Switzerland', '베른', 'Bern', 2],
  ['AT', '오스트리아', 'Austria', '빈', 'Vienna', 2],
  ['SE', '스웨덴', 'Sweden', '스톡홀름', 'Stockholm', 2],
  ['NO', '노르웨이', 'Norway', '오슬로', 'Oslo', 2],
  ['DK', '덴마크', 'Denmark', '코펜하겐', 'Copenhagen', 2],
  ['FI', '핀란드', 'Finland', '헬싱키', 'Helsinki', 2],
  ['PL', '폴란드', 'Poland', '바르샤바', 'Warsaw', 2],
  ['IE', '아일랜드', 'Ireland', '더블린', 'Dublin', 2],
  ['UA', '우크라이나', 'Ukraine', '키이우', 'Kyiv', 2],
  ['CZ', '체코', 'Czechia', '프라하', 'Prague', 2],
  ['HU', '헝가리', 'Hungary', '부다페스트', 'Budapest', 2],
  ['MN', '몽골', 'Mongolia', '울란바토르', 'Ulaanbaatar', 2],
  ['KP', '북한', 'North Korea', '평양', 'Pyongyang', 2],
  ['MY', '말레이시아', 'Malaysia', '쿠알라룸푸르', 'Kuala Lumpur', 2],
  ['SA', '사우디아라비아', 'Saudi Arabia', '리야드', 'Riyadh', 2],
  ['IR', '이란', 'Iran', '테헤란', 'Tehran', 2],
  ['IQ', '이라크', 'Iraq', '바그다드', 'Baghdad', 2],
  ['PK', '파키스탄', 'Pakistan', '이슬라마바드', 'Islamabad', 2],
  ['NP', '네팔', 'Nepal', '카트만두', 'Kathmandu', 2],
  ['KE', '케냐', 'Kenya', '나이로비', 'Nairobi', 2],
  ['NG', '나이지리아', 'Nigeria', '아부자', 'Abuja', 2],
  ['ET', '에티오피아', 'Ethiopia', '아디스아바바', 'Addis Ababa', 2],
  ['MA', '모로코', 'Morocco', '라바트', 'Rabat', 2],
  ['CL', '칠레', 'Chile', '산티아고', 'Santiago', 2],
  ['PE', '페루', 'Peru', '리마', 'Lima', 2],
  ['CO', '콜롬비아', 'Colombia', '보고타', 'Bogotá', 2],
  ['CU', '쿠바', 'Cuba', '아바나', 'Havana', 2],

  ['IS', '아이슬란드', 'Iceland', '레이캬비크', 'Reykjavík', 3],
  ['RO', '루마니아', 'Romania', '부쿠레슈티', 'Bucharest', 3],
  ['BG', '불가리아', 'Bulgaria', '소피아', 'Sofia', 3],
  ['RS', '세르비아', 'Serbia', '베오그라드', 'Belgrade', 3],
  ['HR', '크로아티아', 'Croatia', '자그레브', 'Zagreb', 3],
  ['SK', '슬로바키아', 'Slovakia', '브라티슬라바', 'Bratislava', 3],
  ['SI', '슬로베니아', 'Slovenia', '류블랴나', 'Ljubljana', 3],
  ['EE', '에스토니아', 'Estonia', '탈린', 'Tallinn', 3],
  ['LV', '라트비아', 'Latvia', '리가', 'Riga', 3],
  ['LT', '리투아니아', 'Lithuania', '빌뉴스', 'Vilnius', 3],
  ['BY', '벨라루스', 'Belarus', '민스크', 'Minsk', 3],
  ['GE', '조지아', 'Georgia', '트빌리시', 'Tbilisi', 3],
  ['AM', '아르메니아', 'Armenia', '예레반', 'Yerevan', 3],
  ['AZ', '아제르바이잔', 'Azerbaijan', '바쿠', 'Baku', 3],
  ['KZ', '카자흐스탄', 'Kazakhstan', '아스타나', 'Astana', 3],
  ['UZ', '우즈베키스탄', 'Uzbekistan', '타슈켄트', 'Tashkent', 3],
  ['AF', '아프가니스탄', 'Afghanistan', '카불', 'Kabul', 3],
  ['BD', '방글라데시', 'Bangladesh', '다카', 'Dhaka', 3],
  ['MM', '미얀마', 'Myanmar', '네피도', 'Naypyidaw', 3],
  ['KH', '캄보디아', 'Cambodia', '프놈펜', 'Phnom Penh', 3],
  ['LA', '라오스', 'Laos', '비엔티안', 'Vientiane', 3],
  ['SY', '시리아', 'Syria', '다마스쿠스', 'Damascus', 3],
  ['JO', '요르단', 'Jordan', '암만', 'Amman', 3],
  ['LB', '레바논', 'Lebanon', '베이루트', 'Beirut', 3],
  ['AE', '아랍에미리트', 'United Arab Emirates', '아부다비', 'Abu Dhabi', 3],
  ['QA', '카타르', 'Qatar', '도하', 'Doha', 3],
  ['DZ', '알제리', 'Algeria', '알제', 'Algiers', 3],
  ['TN', '튀니지', 'Tunisia', '튀니스', 'Tunis', 3],
  ['GH', '가나', 'Ghana', '아크라', 'Accra', 3],
  ['SN', '세네갈', 'Senegal', '다카르', 'Dakar', 3],
  ['TZ', '탄자니아', 'Tanzania', '도도마', 'Dodoma', 3],
  ['UG', '우간다', 'Uganda', '캄팔라', 'Kampala', 3],
  ['VE', '베네수엘라', 'Venezuela', '카라카스', 'Caracas', 3],
  ['EC', '에콰도르', 'Ecuador', '키토', 'Quito', 3],
  ['UY', '우루과이', 'Uruguay', '몬테비데오', 'Montevideo', 3],
  ['PY', '파라과이', 'Paraguay', '아순시온', 'Asunción', 3],
  ['JM', '자메이카', 'Jamaica', '킹스턴', 'Kingston', 3],
  ['PA', '파나마', 'Panama', '파나마시티', 'Panama City', 3],
  ['FJ', '피지', 'Fiji', '수바', 'Suva', 3]
].map(([code, ko, en, capKo, capEn, level]) => ({ code, name: { ko, en }, capital: { ko: capKo, en: capEn }, level }));

export const QUESTIONS = 10;   /* 한 판 문제 수 */
export const SECONDS = 10;     /* 한 문제 제한 시간 */
export const CHOICES = 4;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* 한 판: 이 단계까지의 나라에서 겹치지 않게 10개. 보기는 정답 + 같은 단계 이하의 다른 수도 3개. */
export function makeRound(level) {
  const pool = COUNTRIES.filter((c) => c.level <= level);
  return shuffle([...pool]).slice(0, QUESTIONS).map((answer) => ({
    answer,
    choices: shuffle([answer, ...shuffle(pool.filter((c) => c !== answer)).slice(0, CHOICES - 1)])
  }));
}

/* 맞히면 단계 × 10점 + 남은 초(올림). 한 판 최고는 어려움에서 400점. */
export const pointsFor = (level, secsLeft) => level * 10 + Math.ceil(Math.max(0, secsLeft));

/* 별: 10문제 중 10개 → 3, 8개 이상 → 2, 5개 이상 → 1. */
export const starsFor = (correct) => (correct >= QUESTIONS ? 3 : correct >= 8 ? 2 : correct >= 5 ? 1 : 0);

/* 보호막: 켜 둔 상태에서 틀리면(시간 초과 포함) 한 번은 맞은 것으로 치고 보호막이 꺼집니다. 점수는 맞힌 문제만 받습니다. */
export function judge(right, shield) {
  if (right) return { counts: true, points: true, shield };
  return shield ? { counts: true, points: false, shield: false, saved: true } : { counts: false, points: false, shield };
}
