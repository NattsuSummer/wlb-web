// Thai / English UI strings. t('key', {n: 3}) replaces {n}.
export type Lang = 'th' | 'en';

const th = {
  'nav.today': 'วันนี้', 'nav.schedule': 'ตาราง', 'nav.members': 'สมาชิก', 'nav.courses': 'คอร์ส', 'nav.admin': 'Admin',
  'theme.toLight': 'เปลี่ยนเป็นโหมดสว่าง', 'theme.toDark': 'เปลี่ยนเป็นโหมดมืด', 'settings.account': 'ตั้งค่าบัญชี',
  'common.save': 'บันทึก', 'common.cancel': 'ยกเลิก', 'common.saved': 'บันทึกแล้ว', 'common.undo': 'เลิกทำ', 'common.delete': 'ลบ',
  'common.edit': 'แก้', 'common.close': 'ปิด', 'common.loading': 'กำลังโหลด…', 'common.error': 'เกิดข้อผิดพลาด', 'common.retry': 'ลองใหม่',
  'common.hidden': 'ซ่อนไว้', 'common.you': 'คุณ', 'common.hours': 'ชม.', 'common.minutes': 'นาที', 'common.private': 'ส่วนตัว',
  'days.long': 'จันทร์,อังคาร,พุธ,พฤหัส,ศุกร์,เสาร์,อาทิตย์', 'days.short': 'จ,อ,พ,พฤ,ศ,ส,อา',

  'login.title': 'เข้าสู่ระบบ', 'login.sub': 'ใช้ username และรหัสผ่านที่ admin ให้ไว้', 'login.username': 'username', 'login.password': 'รหัสผ่าน',
  'login.show': 'แสดง', 'login.hide': 'ซ่อน', 'login.remember': 'จำฉันไว้ในเครื่องนี้ 30 วัน', 'login.submit': 'เข้าสู่ระบบ',
  'login.help': 'ยังไม่มีบัญชี หรือลืมรหัสผ่าน? ติดต่อ admin ในกลุ่ม', 'login.bad': 'username หรือรหัสผ่านไม่ถูกต้อง',
  'login.locked': 'ใส่รหัสผิดหลายครั้ง ลองใหม่อีกครั้งในอีกไม่กี่นาที', 'login.hero1': '24 ชั่วโมงของเรา', 'login.hero2': 'แบ่งให้พอดี',
  'login.heroSub': 'ตารางชีวิตประจำวัน สัดส่วนเวลา และคอร์สที่เรียนด้วยกันในกลุ่ม',
  'pw.title': 'ตั้งรหัสผ่านใหม่', 'pw.first': 'นี่เป็นการเข้าใช้ครั้งแรก ต้องเปลี่ยนรหัสผ่านเริ่มต้นก่อน', 'pw.current': 'รหัสผ่านปัจจุบัน',
  'pw.new': 'รหัสผ่านใหม่', 'pw.confirm': 'ยืนยันรหัสผ่านใหม่', 'pw.r1': 'อย่างน้อย 8 ตัวอักษร', 'pw.r2': 'มีทั้งตัวอักษรและตัวเลข',
  'pw.r3': 'ไม่ซ้ำกับรหัสเดิม', 'pw.r4': 'ยืนยันรหัสตรงกัน', 'pw.submit': 'บันทึกและเข้าใช้งาน', 'pw.change': 'เปลี่ยนรหัสผ่าน', 'pw.done': 'เปลี่ยนรหัสผ่านแล้ว',

  'home.now': 'ตอนนี้', 'home.left': 'เหลืออีก {t}', 'home.next': 'ถัดไป', 'home.free': 'ช่วงนี้ยังไม่ได้วางแผน', 'home.freeSub': 'ไปที่ตารางเพื่อเพิ่มกิจกรรม',
  'home.others': 'ตอนนี้คนอื่นทำอะไร', 'home.guide': 'ตารางเป็นแค่ไกด์ ไม่ต้องทำตามเป๊ะ', 'home.today': 'ตารางวันนี้', 'home.week': 'ดูทั้งสัปดาห์ →',
  'home.balance': 'สัดส่วนเวลาทั้งสัปดาห์', 'home.balanceLegend': 'แท่ง = จริง · เส้น = เป้า', 'home.noTargets': 'ยังไม่ตั้งเป้า',
  'home.learn': 'เรียนต่อ', 'home.learnSoon': 'ระบบคอร์สกำลังมา (เฟส 3)', 'home.nobody': 'ยังไม่มีสมาชิกคนอื่น', 'home.tomorrow': 'พรุ่งนี้',

  'sched.mine': 'ตารางของฉัน', 'sched.of': 'ตารางของ {name}', 'sched.sub': 'แผนประจำสัปดาห์ไว้เป็นไกด์ · กดที่ช่องเพื่อเลือก แล้วปรับวันและเวลาได้ที่แผงด้านขวา',
  'sched.readonly': 'ดูอย่างเดียว', 'sched.hiddenAll': '{name} ซ่อนตารางไว้', 'sched.edit': 'แก้ช่องเวลา', 'sched.days': 'วัน (เลือกได้หลายวัน)',
  'sched.from': 'ตั้งแต่', 'sched.to': 'ถึง', 'sched.cats': 'หมวดหมู่ (เลือกได้หลายหมวด)', 'sched.desc': 'คำอธิบาย',
  'sched.split': '1 ชม. จะแบ่งให้ {cats} หมวดละ {m} นาที', 'sched.splitHint': 'กดเพิ่มอีกหมวดได้ ถ้าช่วงนั้นทำหลายอย่างพร้อมกัน',
  'sched.willOverwrite': 'จะเขียนทับกิจกรรมเดิม {n} ช่อง', 'sched.free': 'ช่วงนี้ว่าง {n} ช่อง บันทึกได้เลย ไม่ทับอะไร',
  'sched.same': 'ช่วงนี้เป็นค่านี้อยู่แล้ว ไม่มีอะไรเปลี่ยน', 'sched.noDays': 'ยังไม่ได้เลือกวัน', 'sched.clear': 'ล้าง',
  'sched.clearHint': 'ปุ่มล้างจะลบเฉพาะกิจกรรมเดิมที่เลือกไว้: {what}', 'sched.clearNone': 'กดเลือกกิจกรรมในตารางก่อน ถึงจะล้างได้',
  'sched.legendSel': 'ช่วงที่เลือก', 'sched.legendChange': 'ลายขีด = จะถูกเปลี่ยน', 'sched.legendMulti': '2 สี = หลายหมวด', 'sched.legendEmpty': 'ช่องว่าง',
  'sched.confirmTitle': 'ช่วงที่เลือกทับกิจกรรมเดิม', 'sched.confirmSub': 'จะเปลี่ยนเป็น {what} และเขียนทับ {n} ช่อง ดูตารางใหม่ก่อนยืนยัน',
  'sched.confirmList': 'กิจกรรมที่จะถูกทับ', 'sched.preview': 'พรีวิว: ก่อน → หลัง', 'sched.before': 'ก่อน', 'sched.after': 'หลัง', 'sched.afterClear': 'หลังล้าง',
  'sched.changedNote': 'ช่องที่มีกรอบ = ช่องที่จะเปลี่ยน', 'sched.confirmBtn': 'ยืนยัน เขียนทับ', 'sched.clearTitle': 'ล้างกิจกรรมนี้?',
  'sched.clearSub': 'จะลบ {what} รวม {n} ช่อง ช่องจะกลายเป็นว่าง (กดเลิกทำได้ภายหลัง)', 'sched.clearBtn': 'ยืนยัน ล้าง',
  'sched.savedFill': 'บันทึกแล้ว · เพิ่ม {n} ช่อง', 'sched.savedOver': 'บันทึกแล้ว · เขียนทับ {n} ช่อง', 'sched.cleared': 'ล้างแล้ว · {n} ช่อง', 'sched.undone': 'เลิกทำแล้ว',
  'sum.title': 'สรุปสัดส่วน (168 ชม.)', 'sum.planned': 'ชม. ที่วางแผน', 'sum.cat': 'หมวด', 'sum.h': 'ชม.', 'sum.real': 'จริง', 'sum.target': 'เป้า', 'sum.diff': 'ต่าง',
  'sum.empty': 'ว่าง', 'sum.setTargets': 'ตั้งเป้า', 'sum.targetsHelp': 'กำหนดว่าอยากแบ่งเวลาให้แต่ละหมวดกี่ % ของสัปดาห์ (รวมต้องได้ 100%)',
  'sum.approx': '≈ {h} ชม./สัปดาห์ · ตอนนี้วางแผนไว้ {now} ชม.', 'sum.total': 'รวม', 'sum.missing': '(ขาดอีก {n}%)', 'sum.over': '(เกิน {n}%)',
  'sum.saveTargets': 'บันทึกเป้า', 'sum.resetTargets': 'ล้างเป้าทั้งหมด', 'sum.hidden': 'ซ่อนสรุปไว้',

  'members.title': 'สมาชิก', 'members.sub': 'ดูว่าตอนนี้ใครทำอะไร และเปิดดูตารางของแต่ละคนได้ (ดูอย่างเดียว)', 'members.search': 'ค้นหาสมาชิก',
  'members.searchPh': 'ชื่อหรือ username', 'members.today': 'วันนี้', 'members.week': 'สัดส่วนทั้งสัปดาห์', 'members.mine': 'ตารางของฉัน', 'members.view': 'ดูตารางของ {name}',
  'members.privateCard': 'เปิดโหมดส่วนตัวอยู่', 'members.none': 'ไม่พบสมาชิก', 'members.idle': 'ไม่มีกิจกรรมในช่วงนี้',

  'settings.title': 'ตั้งค่า', 'settings.profile': 'โปรไฟล์', 'settings.privacy': 'ความเป็นส่วนตัว', 'settings.appearance': 'ธีมและภาษา', 'settings.tokens': 'API tokens',
  'settings.displayName': 'ชื่อที่แสดง', 'settings.avatar': 'สีรูปโปรไฟล์', 'settings.theme': 'ธีม', 'settings.dark': 'มืด', 'settings.light': 'สว่าง', 'settings.system': 'ตามระบบ',
  'settings.language': 'ภาษา', 'settings.logout': 'ออกจากระบบ',
  'privacy.mode': 'โหมดส่วนตัว', 'privacy.modeSub': 'เปิดแล้วคนอื่นจะเห็นแค่ชื่อกับรูปโปรไฟล์ของคุณ ข้อมูลอื่นซ่อนทั้งหมด',
  'privacy.full': 'แสดงทั้งหมด', 'privacy.cat': 'แค่หมวด', 'privacy.show': 'แสดง', 'privacy.hide': 'ซ่อน',
  'privacy.schedule': 'ตารางรายสัปดาห์', 'privacy.scheduleSub': '"แค่หมวด" = เห็นสีหมวด แต่ไม่เห็นคำอธิบาย',
  'privacy.now': 'ตอนนี้ทำอะไร', 'privacy.nowSub': 'แสดงในหน้าแรกและหน้าสมาชิกของคนอื่น', 'privacy.summary': 'สัดส่วนเวลาและเป้า', 'privacy.summarySub': 'กราฟ % ต่อหมวด และเป้าที่ตั้งไว้',
  'privacy.courses': 'คอร์สที่กำลังเรียน', 'privacy.coursesSub': 'ชื่อคอร์สและความคืบหน้า', 'privacy.answers': 'คำตอบแบบฝึกหัดแบบเขียน', 'privacy.answersSub': 'โน้ตที่คุณเขียนในแบบฝึก',
  'privacy.adminNote': 'admin เห็นข้อมูลตามการตั้งค่านี้เหมือนสมาชิกคนอื่น แต่ยังจัดการบัญชีได้', 'privacy.preview': 'คนอื่นจะเห็นการ์ดของคุณแบบนี้',
  'tokens.sub': 'ใช้กับสคริปต์หรือ AI ที่ต่อ MCP ด้วย token (Claude connector ใช้การ login แทนได้)', 'tokens.name': 'ชื่อ token', 'tokens.create': 'สร้าง token',
  'tokens.once': 'คัดลอก token เก็บไว้ตอนนี้ ระบบจะแสดงให้เห็นแค่ครั้งเดียว', 'tokens.copy': 'คัดลอก', 'tokens.copied': 'คัดลอกแล้ว', 'tokens.revoke': 'ยกเลิก token',
  'tokens.none': 'ยังไม่มี token', 'tokens.lastUsed': 'ใช้ล่าสุด', 'tokens.never': 'ยังไม่เคยใช้', 'tokens.owner': 'เจ้าของ',

  'admin.title': 'Admin', 'admin.sub': 'เห็นเฉพาะ admin', 'admin.users': 'ผู้ใช้', 'admin.timeCats': 'หมวดเวลา', 'admin.tokens': 'API tokens',
  'admin.addUser': '+ เพิ่มผู้ใช้', 'admin.createUser': 'สร้างบัญชี', 'admin.tempPw': 'รหัสผ่านชั่วคราว', 'admin.role': 'role', 'admin.status': 'สถานะ',
  'admin.lastLogin': 'เข้าใช้ล่าสุด', 'admin.manage': 'จัดการ', 'admin.active': 'ใช้งานอยู่', 'admin.mustChange': 'ต้องเปลี่ยนรหัส', 'admin.disabled': 'ปิดบัญชี',
  'admin.reset': 'รีเซ็ตรหัส', 'admin.disable': 'ปิดบัญชี', 'admin.enable': 'เปิดบัญชี', 'admin.never': 'ยังไม่เคยเข้า', 'admin.newUserNote': 'ผู้ใช้ใหม่ต้องเปลี่ยนรหัสตอน login ครั้งแรก และเริ่มด้วยตารางว่าง',
  'admin.resetPrompt': 'รหัสผ่านชั่วคราวใหม่สำหรับ {name} (อย่างน้อย 8 ตัว)', 'admin.addCat': '+ เพิ่มหมวดเวลา', 'admin.used': 'ใช้อยู่ {n} ช่อง',
  'admin.nameTh': 'ชื่อไทย', 'admin.nameEn': 'ชื่ออังกฤษ', 'admin.color': 'สี', 'admin.catInUse': 'ลบไม่ได้ ยังมีช่องใช้หมวดนี้อยู่ ต้องย้ายช่องไปหมวดอื่นก่อน',
  'admin.confirmDisable': 'ปิดบัญชี {name}? เขาจะ login ไม่ได้จนกว่าจะเปิดอีกครั้ง',

  'courses.soonTitle': 'ระบบคอร์สกำลังมา', 'courses.soonSub': 'หน้ารวมคอร์ส บทเรียน และนำเข้าด้วย JSON จะมาในเฟส 3 ตามที่ออกแบบไว้',
  'err.network': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',
};

const en: typeof th = {
  'nav.today': 'Today', 'nav.schedule': 'Schedule', 'nav.members': 'Members', 'nav.courses': 'Courses', 'nav.admin': 'Admin',
  'theme.toLight': 'Switch to light mode', 'theme.toDark': 'Switch to dark mode', 'settings.account': 'Account settings',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.saved': 'Saved', 'common.undo': 'Undo', 'common.delete': 'Delete',
  'common.edit': 'Edit', 'common.close': 'Close', 'common.loading': 'Loading…', 'common.error': 'Something went wrong', 'common.retry': 'Try again',
  'common.hidden': 'Hidden', 'common.you': 'You', 'common.hours': 'h', 'common.minutes': 'min', 'common.private': 'Private',
  'days.long': 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday', 'days.short': 'Mo,Tu,We,Th,Fr,Sa,Su',

  'login.title': 'Log in', 'login.sub': 'Use the username and password your admin gave you', 'login.username': 'Username', 'login.password': 'Password',
  'login.show': 'Show', 'login.hide': 'Hide', 'login.remember': 'Keep me logged in on this device for 30 days', 'login.submit': 'Log in',
  'login.help': "No account or forgot your password? Ask an admin in the group.", 'login.bad': 'Username or password is incorrect',
  'login.locked': 'Too many failed attempts. Try again in a few minutes.', 'login.hero1': 'Our 24 hours,', 'login.hero2': 'in balance',
  'login.heroSub': 'Daily life schedules, time balance and courses we learn together',
  'pw.title': 'Set a new password', 'pw.first': 'This is your first login — please replace the starting password', 'pw.current': 'Current password',
  'pw.new': 'New password', 'pw.confirm': 'Confirm new password', 'pw.r1': 'At least 8 characters', 'pw.r2': 'Has letters and digits',
  'pw.r3': 'Different from the current one', 'pw.r4': 'Both entries match', 'pw.submit': 'Save and continue', 'pw.change': 'Change password', 'pw.done': 'Password changed',

  'home.now': 'Now', 'home.left': '{t} left', 'home.next': 'Next', 'home.free': 'Nothing planned right now', 'home.freeSub': 'Open your schedule to add something',
  'home.others': "What others are doing", 'home.guide': "The schedule is a guide — no need to follow it exactly", 'home.today': 'Today', 'home.week': 'Whole week →',
  'home.balance': 'Weekly time balance', 'home.balanceLegend': 'bar = planned · line = target', 'home.noTargets': 'No targets yet',
  'home.learn': 'Keep learning', 'home.learnSoon': 'Courses are coming (phase 3)', 'home.nobody': 'No other members yet', 'home.tomorrow': 'tomorrow',

  'sched.mine': 'My schedule', 'sched.of': "{name}'s schedule", 'sched.sub': 'A weekly plan to guide you · tap a cell to select it, then adjust days and hours in the panel',
  'sched.readonly': 'View only', 'sched.hiddenAll': '{name} keeps their schedule hidden', 'sched.edit': 'Edit time slots', 'sched.days': 'Days (pick several)',
  'sched.from': 'From', 'sched.to': 'To', 'sched.cats': 'Categories (pick several)', 'sched.desc': 'Description',
  'sched.split': 'Each hour is split between {cats}: {m} min each', 'sched.splitHint': 'Add another category if you do several things at once',
  'sched.willOverwrite': 'This replaces {n} planned hour(s)', 'sched.free': '{n} empty hour(s) — saves without replacing anything',
  'sched.same': 'Already set to this — nothing changes', 'sched.noDays': 'No day selected', 'sched.clear': 'Clear',
  'sched.clearHint': 'Clear removes only the activity you picked: {what}', 'sched.clearNone': 'Pick an activity in the grid first to clear it',
  'sched.legendSel': 'Selected', 'sched.legendChange': 'Stripes = will change', 'sched.legendMulti': '2 colours = several categories', 'sched.legendEmpty': 'Empty',
  'sched.confirmTitle': 'This replaces planned activities', 'sched.confirmSub': 'Changes to {what} and replaces {n} hour(s). Check the new schedule before confirming.',
  'sched.confirmList': 'Activities that will be replaced', 'sched.preview': 'Preview: before → after', 'sched.before': 'Before', 'sched.after': 'After', 'sched.afterClear': 'After',
  'sched.changedNote': 'Outlined cells will change', 'sched.confirmBtn': 'Replace', 'sched.clearTitle': 'Clear this activity?',
  'sched.clearSub': 'Removes {what} — {n} hour(s) become empty (you can undo)', 'sched.clearBtn': 'Clear',
  'sched.savedFill': 'Saved · {n} hour(s) added', 'sched.savedOver': 'Saved · {n} hour(s) replaced', 'sched.cleared': 'Cleared · {n} hour(s)', 'sched.undone': 'Undone',
  'sum.title': 'Balance (168 h)', 'sum.planned': 'h planned', 'sum.cat': 'Category', 'sum.h': 'h', 'sum.real': 'Plan', 'sum.target': 'Target', 'sum.diff': 'Diff',
  'sum.empty': 'Empty', 'sum.setTargets': 'Set targets', 'sum.targetsHelp': 'What share of your week should each category get? (must total 100%)',
  'sum.approx': '≈ {h} h/week · planned now {now} h', 'sum.total': 'Total', 'sum.missing': '({n}% short)', 'sum.over': '({n}% over)',
  'sum.saveTargets': 'Save targets', 'sum.resetTargets': 'Clear all targets', 'sum.hidden': 'Summary is hidden',

  'members.title': 'Members', 'members.sub': "See what everyone is doing now and open their schedules (view only)", 'members.search': 'Search members',
  'members.searchPh': 'Name or username', 'members.today': 'Today', 'members.week': 'Week balance', 'members.mine': 'My schedule', 'members.view': "View {name}'s schedule",
  'members.privateCard': 'Private mode is on', 'members.none': 'No members found', 'members.idle': 'Nothing planned now',

  'settings.title': 'Settings', 'settings.profile': 'Profile', 'settings.privacy': 'Privacy', 'settings.appearance': 'Theme & language', 'settings.tokens': 'API tokens',
  'settings.displayName': 'Display name', 'settings.avatar': 'Avatar colour', 'settings.theme': 'Theme', 'settings.dark': 'Dark', 'settings.light': 'Light', 'settings.system': 'System',
  'settings.language': 'Language', 'settings.logout': 'Log out',
  'privacy.mode': 'Private mode', 'privacy.modeSub': 'Others only see your name and avatar. Everything else is hidden.',
  'privacy.full': 'Everything', 'privacy.cat': 'Categories only', 'privacy.show': 'Show', 'privacy.hide': 'Hide',
  'privacy.schedule': 'Weekly schedule', 'privacy.scheduleSub': '"Categories only" shows colours but not descriptions',
  'privacy.now': 'What I\'m doing now', 'privacy.nowSub': "Shown on other people's home and members pages", 'privacy.summary': 'Time balance & targets', 'privacy.summarySub': '% per category and your targets',
  'privacy.courses': 'Courses in progress', 'privacy.coursesSub': 'Course names and progress', 'privacy.answers': 'Written exercise answers', 'privacy.answersSub': 'Notes you write in exercises',
  'privacy.adminNote': 'Admins see the same as everyone else, but can still manage accounts.', 'privacy.preview': 'This is how others see your card',
  'tokens.sub': 'For scripts or AI tools that connect with a token (the Claude connector can log in instead)', 'tokens.name': 'Token name', 'tokens.create': 'Create token',
  'tokens.once': 'Copy this token now — it is shown only once', 'tokens.copy': 'Copy', 'tokens.copied': 'Copied', 'tokens.revoke': 'Revoke',
  'tokens.none': 'No tokens yet', 'tokens.lastUsed': 'Last used', 'tokens.never': 'Never used', 'tokens.owner': 'Owner',

  'admin.title': 'Admin', 'admin.sub': 'Admins only', 'admin.users': 'Users', 'admin.timeCats': 'Time categories', 'admin.tokens': 'API tokens',
  'admin.addUser': '+ Add user', 'admin.createUser': 'Create account', 'admin.tempPw': 'Temporary password', 'admin.role': 'Role', 'admin.status': 'Status',
  'admin.lastLogin': 'Last login', 'admin.manage': 'Manage', 'admin.active': 'Active', 'admin.mustChange': 'Must change password', 'admin.disabled': 'Disabled',
  'admin.reset': 'Reset password', 'admin.disable': 'Disable', 'admin.enable': 'Enable', 'admin.never': 'Never', 'admin.newUserNote': 'New users must change the password on first login and start with an empty schedule.',
  'admin.resetPrompt': 'New temporary password for {name} (8+ characters)', 'admin.addCat': '+ Add time category', 'admin.used': 'Used by {n} slot(s)',
  'admin.nameTh': 'Thai name', 'admin.nameEn': 'English name', 'admin.color': 'Colour', 'admin.catInUse': 'Cannot delete: some slots still use this category. Move them first.',
  'admin.confirmDisable': 'Disable {name}? They cannot log in until enabled again.',

  'courses.soonTitle': 'Courses are coming', 'courses.soonSub': 'The course list, lessons and JSON import arrive in phase 3, as designed.',
  'err.network': 'Cannot reach the server. Please try again.',
};

const dicts = { th, en };
export type Key = keyof typeof th;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s: string = dicts[lang][key] ?? dicts.th[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const dayNames = (lang: Lang, kind: 'long' | 'short') => translate(lang, kind === 'long' ? 'days.long' : 'days.short').split(',');
