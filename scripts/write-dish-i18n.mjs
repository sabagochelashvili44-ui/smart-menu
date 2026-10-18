import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {Record<string, { en: [string, string]; ru: [string, string] }>} */
const i18n = {
  "ფხალი ასორტი": [
    ["Pkhali assortment", "Spinach, beet, and bean pkhali with walnuts and cilantro."],
    ["Пхали ассорти", "Пхали из шпината, свёклы и фасоли с грецким орехом и кинзой."],
  ],
  "ბადრიჯანი ნიგვზით": [
    ["Eggplant with walnuts", "Grilled eggplant rolls with walnut cream and pomegranate."],
    ["Бадриджани с орехами", "Рулеты из баклажана с ореховым кремом и гранатом."],
  ],
  ჯონჯოლი: [
    ["Jonjoli", "Pickled bladdernut blossoms with oil, onion, and cilantro."],
    ["Джонджоли", "Маринованный джонджоли с маслом, луком и кинзой."],
  ],
  გებჟალია: [
    ["Gebzhalia", "Megrelian gebzhalia with mint, sulguni, and yogurt sauce."],
    ["Гебжалия", "Мегрельская гебжалия с мятой, сулугуни и мацони."],
  ],
  "ნადუღი პიტნით": [
    ["Nadughi with mint", "Fresh nadughi cheese with mint, cucumber, and shoti bread."],
    ["Надуги с мятой", "Надуги с мятой, огурцом и шоти."],
  ],
  "სულგუნი გრილზე": [
    ["Grilled sulguni", "Hot grilled sulguni with tkemali sauce."],
    ["Сулугуни на гриле", "Горячий сулугуни с ткемали."],
  ],
  ქუფათი: [
    ["Kupati", "Pan-fried kupati sausage with tkemali."],
    ["Купаты", "Жареные купаты с ткемали."],
  ],
  "წითელი ლობიო": [
    ["Red lobio", "Racha-style red beans with spices and mchadi."],
    ["Красная лобио", "Рачинская красная фасоль со специями и мчади."],
  ],
  "მწვანე ლობიო კვერცხით": [
    ["Green beans with egg", "Green beans with egg, cilantro, and garlic."],
    ["Зелёная фасоль с яйцом", "Стручковая фасоль с яйцом, кинзой и чесноком."],
  ],
  "აჯიკა და პური": [
    ["Adjika and bread", "House adjika, tkemali, and warm shoti bread."],
    ["Аджика и хлеб", "Домашняя аджика, ткемали и тёплый шоти."],
  ],
  "ქართული სალათი": [
    ["Georgian salad", "Tomato, cucumber, onion, cilantro, and walnut oil."],
    ["Грузинский салат", "Помидор, огурец, лук, кинза и ореховое масло."],
  ],
  "თბილისური სალათი": [
    ["Tbilisi salad", "Tomato, cucumber, pepper, onion, and sulguni."],
    ["Тбилисский салат", "Помидор, огурец, перец, лук и сулугуни."],
  ],
  "ჭარხლის სალათი ნიგვზით": [
    ["Beet salad with walnuts", "Boiled beet with walnuts, garlic, and matsoni."],
    ["Свекольный салат с орехами", "Свёкла с грецким орехом, чесноком и мацони."],
  ],
  "ავოკადოს სალათი": [
    ["Avocado salad", "Avocado, tomato, lemon, and olive oil."],
    ["Салат с авокадо", "Авокадо, помидор, лимон и оливковое масло."],
  ],
  "ქათმის სალათი": [
    ["Chicken salad", "Grilled chicken, greens, cucumber, and yogurt dressing."],
    ["Куриный салат", "Курица гриль, зелень, огурец и йогуртовая заправка."],
  ],
  "სოკოს სალათი": [
    ["Mushroom salad", "Sautéed wild mushrooms with onion and cilantro."],
    ["Грибной салат", "Жареные лесные грибы с луком и кинзой."],
  ],
  "ბერძნული სალათი": [
    ["Greek salad", "Feta, olives, tomato, cucumber, and oregano."],
    ["Греческий салат", "Фета, оливки, помидор, огурец и орегано."],
  ],
  "კიტრი და პომიდორი": [
    ["Cucumber and tomato", "Seasonal cucumber and tomato with sunflower oil."],
    ["Огурец и помидор", "Сезонные огурцы и помидоры с подсолнечным маслом."],
  ],
  "ბადრიჯნის სალათი": [
    ["Eggplant salad", "Grilled eggplant with garlic, cilantro, and pomegranate."],
    ["Салат из баклажанов", "Баклажан гриль с чесноком, кинзой и гранатом."],
  ],
  "თევზის სალათი": [
    ["Fish salad", "Smoked salmon, cucumber, lemon, and dill."],
    ["Рыбный салат", "Копчёный лосось, огурец, лимон и укроп."],
  ],
  ხარჩო: [
    ["Kharcho", "Beef kharcho with rice, tkemali, and cilantro."],
    ["Харчо", "Говяжье харчо с рисом, ткемали и кинзой."],
  ],
  ჩიხირთმა: [
    ["Chikhirtma", "Chicken chikhirtma with egg and cilantro."],
    ["Чихиртма", "Куриная чихиртма с яйцом и кинзой."],
  ],
  "წიწიბურას შეჭამანდი": [
    ["Nettle soup", "Nettle soup with garlic and sour cream."],
    ["Суп из крапивы", "Суп из крапивы с чесноком и сметаной."],
  ],
  "სოკოს კრემ-სუპი": [
    ["Mushroom cream soup", "Wild mushroom cream soup with warm bread."],
    ["Грибной крем-суп", "Крем-суп из лесных грибов с хлебом."],
  ],
  "ბოსტნეულის სუპი": [
    ["Vegetable soup", "Light seasonal vegetable soup."],
    ["Овощной суп", "Лёгкий суп из сезонных овощей."],
  ],
  "ქათმის ბულიონი": [
    ["Chicken broth", "Clear chicken broth with noodles."],
    ["Куриный бульон", "Прозрачный куриный бульон с лапшой."],
  ],
  "თევზის წვნიანი": [
    ["Fish soup", "Trout soup with potato and cilantro."],
    ["Уха", "Суп из форели с картофелем и кинзой."],
  ],
  "ლობიოს წვნიანი": [
    ["Bean soup", "Red bean soup with herbs."],
    ["Фасолевый суп", "Суп из красной фасоли с зеленью."],
  ],
  "მატსონის სუპი": [
    ["Matsoni soup", "Chilled matsoni soup with cucumber and mint."],
    ["Суп из мацони", "Холодный суп из мацони с огурцом и мятой."],
  ],
  "ხაშის სუპი": [
    ["Khashi", "Traditional khashi with garlic — a morning dish."],
    ["Хаши", "Традиционный хаш с чесноком — утреннее блюдо."],
  ],
  "აჭარული ხაჭაპური": [
    ["Adjarian khachapuri", "Boat-shaped Adjarian khachapuri with sulguni, egg, and butter."],
    ["Аджарский хачапури", "Хачапури-лодка с сулугуни, яйцом и маслом."],
  ],
  "იმერული ხაჭაპური": [
    ["Imeretian khachapuri", "Classic Imeretian cheese bread with a thin crust."],
    ["Имеретинский хачапури", "Классический имеретинский хачапури с тонким тестом."],
  ],
  "მეგრული ხაჭაპური": [
    ["Megrelian khachapuri", "Megrelian khachapuri with extra sulguni on top."],
    ["Мегрельский хачапури", "Мегрельский хачапури с сулугуни сверху."],
  ],
  "გურული ხაჭაპური": [
    ["Gurian khachapuri", "Gurian khachapuri stuffed with egg."],
    ["Гурийский хачапури", "Гурийский хачапури с яйцом внутри."],
  ],
  "ფენოვანი ხაჭაპური": [
    ["Flaky khachapuri", "Laminated pastry khachapuri with sulguni."],
    ["Слоёный хачапури", "Слоёный хачапури с сулугуни."],
  ],
  კუბდარი: [
    ["Kubdari", "Svanetian kubdari with meat and Svan salt."],
    ["Кубдари", "Сванский кубдари с мясом и сванской солью."],
  ],
  ლობიანი: [
    ["Lobiani", "Racha lobiani with smoked bacon."],
    ["Лобиани", "Рачинский лобиани с копчёным беконом."],
  ],
  "სოკოვანი ხაჭაპური": [
    ["Mushroom khachapuri", "Khachapuri with wild mushrooms and sulguni."],
    ["Грибной хачапури", "Хачапури с лесными грибами и сулугуни."],
  ],
  "წიწაკიანი ხაჭაპური": [
    ["Spicy khachapuri", "Khachapuri with hot pepper and adjika."],
    ["Острый хачапури", "Хачапури с перцем и аджикой."],
  ],
  "მინი ხაჭაპური ასორტი": [
    ["Mini khachapuri assortment", "Three mini khachapuri: Imeretian, Megrelian, mushroom."],
    ["Мини-хачапури ассорти", "Три мини-хачапури: имеретинский, мегрельский, грибной."],
  ],
  "კალაკური ხინკალი 5 ც": [
    ["Kalakuri khinkali 5 pcs", "Juicy meat khinkali — 5 pieces."],
    ["Калакурские хинкали 5 шт", "Сочные мясные хинкали — 5 штук."],
  ],
  "კალაკური ხინკალი 10 ც": [
    ["Kalakuri khinkali 10 pcs", "Juicy meat khinkali — 10 pieces."],
    ["Калакурские хинкали 10 шт", "Сочные мясные хинкали — 10 штук."],
  ],
  "მთიულური ხინკალი 5 ც": [
    ["Mtiuluri khinkali 5 pcs", "Mountain-style khinkali with a juicier filling."],
    ["Мтиульские хинкали 5 шт", "Мтиульские хинкали с более сочной начинкой."],
  ],
  "სოკოს ხინკალი 5 ც": [
    ["Mushroom khinkali 5 pcs", "Wild mushroom khinkali."],
    ["Грибные хинкали 5 шт", "Хинкали с лесными грибами."],
  ],
  "კარტოფილის ხინკალი 5 ც": [
    ["Potato khinkali 5 pcs", "Potato and cheese khinkali."],
    ["Картофельные хинкали 5 шт", "Хинкали с картофелем и сыром."],
  ],
  "ყველის ხინკალი 5 ც": [
    ["Cheese khinkali 5 pcs", "Khinkali with sulguni and Imeretian cheese."],
    ["Сырные хинкали 5 шт", "Хинкали с сулугуни и имеретинским сыром."],
  ],
  "კალმახის ხინკალი 5 ც": [
    ["Trout khinkali 5 pcs", "Trout khinkali with cilantro."],
    ["Хинкали с форелью 5 шт", "Хинкали с форелью и кинзой."],
  ],
  "ბოსტნეულის ხინკალი 5 ც": [
    ["Vegetable khinkali 5 pcs", "Seasonal vegetable khinkali."],
    ["Овощные хинкали 5 шт", "Хинкали с сезонными овощами."],
  ],
  "მიქსი ხინკალი 10 ც": [
    ["Mixed khinkali 10 pcs", "Meat, mushroom, and potato — 10 pieces."],
    ["Микс хинкали 10 шт", "Мясо, грибы и картофель — 10 штук."],
  ],
  "ხინკალი ტყემლით": [
    ["Khinkali with tkemali", "Five meat khinkali with house tkemali."],
    ["Хинкали с ткемали", "Пять мясных хинкали с домашним ткемали."],
  ],
  საცივი: [
    ["Satsivi", "Cold chicken satsivi in walnut sauce."],
    ["Сациви", "Холодная курица сациви в ореховом соусе."],
  ],
  ჩაქაფული: [
    ["Chakapuli", "Lamb chakapuli with tarragon and tkemali."],
    ["Чакапули", "Чакапули из ягнёнка с эстрагоном и ткемали."],
  ],
  შქმერული: [
    ["Shkmeruli", "Chicken shkmeruli with walnuts and garlic."],
    ["Шкмерули", "Курица шкмерули с орехами и чесноком."],
  ],
  ოჯახური: [
    ["Ojakhuri", "Pork ojakhuri with potatoes and peppers."],
    ["Оджахури", "Свинина оджахури с картофелем и перцем."],
  ],
  ჩანახი: [
    ["Chanakhi", "Pork chanakhi with eggplant and tomato, baked in a pot."],
    ["Чанахи", "Свинина чанахи с баклажаном и помидорами в горшочке."],
  ],
  "წიწილა ტაბაკა": [
    ["Chicken tabaka", "Pressed chicken tabaka with a side."],
    ["Цыплёнок табака", "Цыплёнок табака с гарниром."],
  ],
  ბაჟე: [
    ["Bazhe", "Chicken in bazhe walnut sauce."],
    ["Баже", "Курица в ореховом соусе баже."],
  ],
  ოსტრი: [
    ["Ostri", "Beef ostri in tomato sauce with peppers."],
    ["Остри", "Говядина остри в томатном соусе с перцем."],
  ],
  "ხბოს აზრდოლი": [
    ["Veal azrdoli", "Veal azrdoli in wine sauce."],
    ["Телятина аздроли", "Телятина аздроли в винном соусе."],
  ],
  "ღორის ორწყული": [
    ["Pork ortsquli", "Pork ortsquli with pomegranate sauce."],
    ["Свинина орцкули", "Свинина орцкули с гранатовым соусом."],
  ],
  "ღორის მწვადი": [
    ["Pork mtsvadi", "Pork shashlik with onion and tkemali."],
    ["Свиной мцвади", "Свиной шашлык с луком и ткемали."],
  ],
  "ხბოს მწვადი": [
    ["Veal mtsvadi", "Veal shashlik with Svan salt."],
    ["Телячий мцвади", "Телячий шашлык со сванской солью."],
  ],
  "ქათმის მწვადი": [
    ["Chicken mtsvadi", "Chicken shashlik with adjika."],
    ["Куриный мцвади", "Куриный шашлык с аджикой."],
  ],
  "ლულა-ქაბაბი": [
    ["Lula kebab", "Lula kebab with onion and bread."],
    ["Люля-кебаб", "Люля-кебаб с луком и хлебом."],
  ],
  "კუპატი გრილზე": [
    ["Grilled kupati", "Grilled kupati with tkemali."],
    ["Купаты на гриле", "Купаты на гриле с ткемали."],
  ],
  "ღორის ნეკნები": [
    ["Pork ribs", "Glazed pork ribs with adjika."],
    ["Свиные рёбра", "Свиные рёбра с аджикой."],
  ],
  "საქონლის სტეიკი": [
    ["Beef steak", "Beef steak, medium, with a side."],
    ["Стейк из говядины", "Стейк средней прожарки с гарниром."],
  ],
  "ბოსტნეული გრილზე": [
    ["Grilled vegetables", "Seasonal vegetables grilled with char marks."],
    ["Овощи на гриле", "Сезонные овощи на гриле."],
  ],
  "მწვადის ასორტი 2 პერს.": [
    ["Mtsvadi platter for 2", "Pork, chicken, lula, and sulguni — for two."],
    ["Ассорти мцвади на 2 перс.", "Свинина, курица, люля и сулугуни — на двоих."],
  ],
  "ღვიძლი გრილზე": [
    ["Grilled liver", "Veal liver with onion on the grill."],
    ["Печень на гриле", "Телячья печень с луком на гриле."],
  ],
  "კალმახი გრილზე": [
    ["Grilled trout", "Mountain trout grilled with lemon."],
    ["Форель на гриле", "Горная форель на гриле с лимоном."],
  ],
  "კალმახი ნიგვზით": [
    ["Trout with walnuts", "Trout in walnut sauce."],
    ["Форель с орехами", "Форель в ореховом соусе."],
  ],
  "დორადო გრილზე": [
    ["Grilled dorado", "Grilled dorado with herbs."],
    ["Дорадо на гриле", "Дорадо на гриле с зеленью."],
  ],
  "ორაგული გრილზე": [
    ["Grilled salmon", "Salmon steak with lemon."],
    ["Лосось на гриле", "Стейк лосося с лимоном."],
  ],
  ქარიშხალა: [
    ["Fried karishkhala", "Fried karishkhala in cornmeal."],
    ["Каришхала", "Жареная каришхала в кукурузной муке."],
  ],
  "კრევეტები ნიორში": [
    ["Garlic shrimp", "Shrimp in garlic and white wine."],
    ["Креветки с чесноком", "Креветки в чесноке и белом вине."],
  ],
  მიდიები: [
    ["Mussels", "Mussels in tomato sauce."],
    ["Мидии", "Мидии в томатном соусе."],
  ],
  "კალმარები გრილზე": [
    ["Grilled calamari", "Calamari with lemon and adjika."],
    ["Кальмары на гриле", "Кальмары с лимоном и аджикой."],
  ],
  "თევზის პლეით": [
    ["Fish platter", "Trout, shrimp, and grilled vegetables."],
    ["Рыбное плато", "Форель, креветки и овощи гриль."],
  ],
  "სომი ტაფაზე": [
    ["Pan-fried catfish", "Catfish pan-fried with cilantro."],
    ["Сом на сковороде", "Сом на сковороде с кинзой."],
  ],
  აჯაფსანდალი: [
    ["Ajapsandali", "Eggplant, pepper, and tomato — served hot or cold."],
    ["Аджапсандали", "Баклажан, перец и помидор — горячим или холодным."],
  ],
  "ტოლმა სოკოთი": [
    ["Mushroom tolma", "Grape leaves stuffed with mushrooms and rice."],
    ["Толма с грибами", "Виноградные листья с грибами и рисом."],
  ],
  "ბადრიჯანი გრილზე": [
    ["Grilled eggplant", "Grilled eggplant with adjika."],
    ["Баклажан на гриле", "Баклажан гриль с аджикой."],
  ],
  "სოკო ქვაბში": [
    ["Pot mushrooms", "Wild mushrooms with cilantro and garlic."],
    ["Грибы в казане", "Лесные грибы с кинзой и чесноком."],
  ],
  "შქმერული სოკოთი": [
    ["Mushroom shkmeruli", "Mushroom shkmeruli with walnuts."],
    ["Шкмерули с грибами", "Грибное шкмерули с орехами."],
  ],
  "ბოსტნეულის ჩაქაფული": [
    ["Vegetable chakapuli", "Green chakapuli with vegetables and tarragon."],
    ["Овощное чакапули", "Зелёное чакапули с овощами и эстрагоном."],
  ],
  "ფხალი თეფში": [
    ["Pkhali plate", "Three pkhali, mchadi, and adjika."],
    ["Тарелка пхали", "Три вида пхали, мчади и аджика."],
  ],
  "ეკალა ნიგვზით": [
    ["Nettle with walnuts", "Nettle in walnut sauce."],
    ["Крапива с орехами", "Крапива в ореховом соусе."],
  ],
  "ქაბაბი ბოსტნეულით": [
    ["Vegetable kebab", "Grilled vegetable kebab."],
    ["Кебаб из овощей", "Овощной кебаб на гриле."],
  ],
  "სოკო სულგუნით": [
    ["Mushrooms with sulguni", "Sautéed mushrooms with sulguni."],
    ["Грибы с сулугуни", "Жареные грибы с сулугуни."],
  ],
  ელარჯი: [
    ["Elarji", "Megrelian elarji with sulguni."],
    ["Эларджи", "Мегрельское эларджи с сулугуни."],
  ],
  ღომი: [
    ["Ghomi", "Ghomi with or without cheese."],
    ["Гоми", "Гоми с сыром или без."],
  ],
  "ტაფაზე კარტოფილი": [
    ["Pan-fried potatoes", "Crispy potatoes with Svan salt."],
    ["Картофель на сковороде", "Хрустящий картофель со сванской солью."],
  ],
  "კარტოფილის პიურე": [
    ["Mashed potatoes", "Buttery mashed potatoes."],
    ["Картофельное пюре", "Пюре с маслом."],
  ],
  ფრი: [
    ["French fries", "Potato fries."],
    ["Картофель фри", "Картофель фри."],
  ],
  "ბრინჯი ქინძით": [
    ["Cilantro rice", "Rice with cilantro and butter."],
    ["Рис с кинзой", "Рис с кинзой и маслом."],
  ],
  "გრილის ბოსტნეული": [
    ["Grilled vegetable side", "Zucchini, pepper, and eggplant with grill marks."],
    ["Овощи гриль", "Кабачок, перец и баклажан с полосками гриля."],
  ],
  "სიმინდი გრილზე": [
    ["Grilled corn", "Corn on the cob with butter."],
    ["Кукуруза на гриле", "Кукуруза с маслом."],
  ],
  წიწიბურა: [
    ["Buckwheat", "Boiled buckwheat."],
    ["Гречка", "Варёная гречка."],
  ],
  "მჟავე ასორტი": [
    ["Pickle assortment", "Pickled cucumber, cabbage, and tkemali."],
    ["Соленья ассорти", "Огурцы, капуста и ткемали."],
  ],
  "შოთის პური": [
    ["Shoti bread", "Warm shoti bread from the tone oven."],
    ["Шоти", "Тёплый шоти из тонэ."],
  ],
  "პურის კალათა": [
    ["Bread basket", "Shoti, mchadi, and lavash."],
    ["Хлебная корзина", "Шоти, мчади и лаваш."],
  ],
  მჭადი: [
    ["Mchadi", "Corn mchadi with or without cheese."],
    ["Мчади", "Кукурузные мчади с сыром или без."],
  ],
  "ჩვის პური": [
    ["Pan bread", "Skillet chvis bread."],
    ["Чвиси пури", "Хлеб со сковороды."],
  ],
  "ნიორიანი პური": [
    ["Garlic bread", "Grilled bread with garlic butter."],
    ["Чесночный хлеб", "Хлеб гриль с чесночным маслом."],
  ],
  ლავაში: [
    ["Lavash", "Warm lavash."],
    ["Лаваш", "Тёплый лаваш."],
  ],
  "სიმინდის პური": [
    ["Corn bread", "Corn bread."],
    ["Кукурузный хлеб", "Кукурузный хлеб."],
  ],
  ნაზუქი: [
    ["Nazuki", "Sweet nazuki for tea."],
    ["Назуки", "Сладкие назуки к чаю."],
  ],
  "იმერული პური": [
    ["Imeretian bread", "Imeretian yeast bread."],
    ["Имеретинский хлеб", "Имеретинский дрожжевой хлеб."],
  ],
  "ყველიანი პური": [
    ["Cheese bread", "Shoti topped with sulguni."],
    ["Хлеб с сыром", "Шоти с сулугуни сверху."],
  ],
  "თაფლის ნამცხვარი კაკლით": [
    ["Honey walnut cake", "Layered Georgian honey cake with sour cream and walnuts."],
    ["Медовый торт с орехами", "Слоёный медовый торт со сметаной и грецким орехом."],
  ],
  გოზინაყი: [
    ["Gozinaki", "Honey gozinaki with walnuts."],
    ["Гозинаки", "Медовые гозинаки с грецким орехом."],
  ],
  ჩურჩხელა: [
    ["Churchkhela", "Saperavi churchkhela with walnuts."],
    ["Чурчхела", "Чурчхела из саперави с орехами."],
  ],
  ფელამუში: [
    ["Pelamushi", "Grape pelamushi pudding."],
    ["Пеламуши", "Виноградный пеламуши."],
  ],
  "ნაყინი ვანილი": [
    ["Vanilla ice cream", "House vanilla ice cream."],
    ["Ванильное мороженое", "Домашнее ванильное мороженое."],
  ],
  "შოკოლადის ნამცხვარი": [
    ["Chocolate cake", "Chocolate cake."],
    ["Шоколадный торт", "Шоколадный торт."],
  ],
  "ხილის ასორტი": [
    ["Fruit assortment", "Seasonal fruit."],
    ["Фруктовое ассорти", "Сезонные фрукты."],
  ],
  პანაკოტა: [
    ["Panna cotta", "Vanilla panna cotta with berries."],
    ["Панна котта", "Ванильная панна котта с ягодами."],
  ],
  ბაქლავა: [
    ["Baklava", "Honey baklava with walnuts."],
    ["Пахлава", "Медовая пахлава с орехами."],
  ],
  ტირამისუ: [
    ["Tiramisu", "Classic tiramisu."],
    ["Тирамису", "Классический тирамису."],
  ],
  ტარხუნა: [
    ["Tarkhuna", "Sparkling tarkhuna lemonade."],
    ["Тархун", "Газированный тархун."],
  ],
  ლიმონათი: [
    ["Lemonade", "House lemonade."],
    ["Лимонад", "Домашний лимонад."],
  ],
  ნაყინწარი: [
    ["Nakintsbari", "Nakintsbari lemonade."],
    ["Накинцбари", "Лимонад накинцбари."],
  ],
  "ვარდის ლიმონათი": [
    ["Rose lemonade", "Rose lemonade."],
    ["Розовый лимонад", "Розовый лимонад."],
  ],
  კომპოტი: [
    ["Kompot", "Seasonal fruit kompot."],
    ["Компот", "Компот из сезонных фруктов."],
  ],
  "მატსონი სასმელი": [
    ["Drinking matsoni", "Chilled matsoni."],
    ["Мацони напиток", "Охлаждённый мацони."],
  ],
  "ჩაი შავი": [
    ["Black tea", "Georgian black tea."],
    ["Чёрный чай", "Грузинский чёрный чай."],
  ],
  "ყავა ამერიკანო": [
    ["Americano", "Americano coffee."],
    ["Американо", "Американо."],
  ],
  "წყალი 0.5 ლ": [
    ["Water 0.5 L", "Still or sparkling water."],
    ["Вода 0.5 л", "Газированная или негазированная вода."],
  ],
  კაპუჩინო: [
    ["Cappuccino", "Cappuccino."],
    ["Капучино", "Капучино."],
  ],
  "საფერავი ჭიქა": [
    ["Saperavi glass", "Dry Kakheti Saperavi — 150 ml."],
    ["Саперави бокал", "Сухой кахетинский саперави — 150 мл."],
  ],
  "საფერავი ბოთლი": [
    ["Saperavi bottle", "Saperavi 750 ml."],
    ["Саперави бутылка", "Саперави 750 мл."],
  ],
  "რქაწითელი ჭიქა": [
    ["Rkatsiteli glass", "Amber qvevri Rkatsiteli — 150 ml."],
    ["Ркацители бокал", "Янтарное ркацители — 150 мл."],
  ],
  "რქაწითელი ბოთლი": [
    ["Rkatsiteli bottle", "Rkatsiteli 750 ml."],
    ["Ркацители бутылка", "Ркацители 750 мл."],
  ],
  "ქისი ჭიქა": [
    ["Kisi glass", "Kisi qvevri wine — 150 ml."],
    ["Киси бокал", "Киси из квеври — 150 мл."],
  ],
  "მწვანე ჭიქა": [
    ["Mtsvane glass", "Kakhetian Mtsvane — 150 ml."],
    ["Мцване бокал", "Кахетинское мцване — 150 мл."],
  ],
  "ცოლიკაური ჭიქა": [
    ["Tsolikauri glass", "Imeretian Tsolikauri — 150 ml."],
    ["Цоликаури бокал", "Имеретинское цоликаури — 150 мл."],
  ],
  "ხვანჭკარა ჭიქა": [
    ["Khvanchkara glass", "Semi-sweet Khvanchkara — 150 ml."],
    ["Хванчкара бокал", "Полусладкая хванчкара — 150 мл."],
  ],
  "ქინძმარაული ჭიქა": [
    ["Kindzmarauli glass", "Semi-sweet Kindzmarauli — 150 ml."],
    ["Киндзмараули бокал", "Полусладкое киндзмараули — 150 мл."],
  ],
  "ტვიში ჭიქა": [
    ["Tvishi glass", "Semi-sweet Tvishi — 150 ml."],
    ["Твиши бокал", "Полусладкое твиши — 150 мл."],
  ],
  "ნატახტარი ლუდი": [
    ["Natakhtari beer", "Natakhtari 0.5 L."],
    ["Пиво Натахтари", "Натахтари 0.5 л."],
  ],
  "ყაზბეგი ლუდი": [
    ["Kazbegi beer", "Kazbegi 0.5 L."],
    ["Пиво Казбеги", "Казбеги 0.5 л."],
  ],
  "ჭაჭა ჭიქა": [
    ["Chacha glass", "Grape chacha 50 ml."],
    ["Чача бокал", "Виноградная чача 50 мл."],
  ],
  "ჭაჭა ბოთლი": [
    ["Chacha bottle", "House chacha 500 ml."],
    ["Чача бутылка", "Домашняя чача 500 мл."],
  ],
  "ქართული კონიაკი": [
    ["Georgian cognac", "Cognac 50 ml."],
    ["Грузинский коньяк", "Коньяк 50 мл."],
  ],
  "არაყი 50 მლ": [
    ["Vodka 50 ml", "Vodka 50 ml."],
    ["Водка 50 мл", "Водка 50 мл."],
  ],
  ვერმუტი: [
    ["Vermouth", "Vermouth on ice."],
    ["Вермут", "Вермут со льдом."],
  ],
  მოხიტო: [
    ["Mojito", "Mojito with mint and lime."],
    ["Мохито", "Мохито с мятой и лаймом."],
  ],
  "სახლის ლიმონჩელო": [
    ["House limoncello", "Limoncello 40 ml."],
    ["Домашний лимончелло", "Лимончелло 40 мл."],
  ],
  "ესპრესო ტონიკი": [
    ["Espresso tonic", "Espresso tonic."],
    ["Эспрессо-тоник", "Эспрессо-тоник."],
  ],
};

const keys = Object.keys(i18n);
if (keys.length !== 150) {
  throw new Error(`Expected 150 translations, got ${keys.length}`);
}

const lines = [
  "/** Generated dish name/description translations keyed by Georgian menu names. */",
  "export type DishI18n = { en: { name: string; description: string }; ru: { name: string; description: string } };",
  "",
  "export const DISH_I18N: Record<string, DishI18n> = {",
];

for (const [ka, pair] of Object.entries(i18n)) {
  const [en, ru] = pair;
  lines.push(
    `  ${JSON.stringify(ka)}: {`,
    `    en: { name: ${JSON.stringify(en[0])}, description: ${JSON.stringify(en[1])} },`,
    `    ru: { name: ${JSON.stringify(ru[0])}, description: ${JSON.stringify(ru[1])} },`,
    `  },`,
  );
}

lines.push("};", "");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src", "lib", "georgian-house-i18n.ts");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`wrote ${keys.length} dishes to ${out}`);
