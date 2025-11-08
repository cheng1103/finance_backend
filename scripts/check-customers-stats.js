const mongoose = require('mongoose');

async function checkCustomers() {
  try {
    const uri = "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";
    await mongoose.connect(uri);
    console.log('✅ 连接成功\n');

    const db = mongoose.connection.db;

    console.log('📊 Customers Collection 分析:');
    console.log('='.repeat(60));

    // 总数
    const total = await db.collection('customers').countDocuments();
    console.log('总客户数: ' + total + '\n');

    // 查看所有customers
    const customers = await db.collection('customers').find().toArray();

    console.log('所有客户数据:');
    customers.forEach((customer, index) => {
      console.log('\n' + (index + 1) + '. ' + customer.name);
      console.log('   Email: ' + customer.email);
      console.log('   注册时间: ' + new Date(customer.createdAt).toLocaleString('zh-CN'));
      console.log('   贷款申请数: ' + (customer.loanApplications?.length || 0));
      console.log('   快速申请数: ' + (customer.quickApplications?.length || 0));
      console.log('   详细咨询数: ' + (customer.detailedInquiries?.length || 0));
    });

    // 检查是否有其他统计来源
    console.log('\n\n📊 查找其他可能的统计数据源...\n');

    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      if (coll.name.includes('stat') || coll.name.includes('click') || coll.name.includes('visit')) {
        const count = await db.collection(coll.name).countDocuments();
        console.log('   ' + coll.name + ': ' + count + ' 条记录');
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkCustomers();
